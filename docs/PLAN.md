# FulfillHub – plan projektu

## 1. Cel i zakres
Aplikacja webowa dla magazynu fulfillment. Magazyn przechowuje towar wielu sklepów internetowych i realizuje ich zamówienia: przyjmuje dostawy, rezerwuje stany pod zamówienia, kompletuje, pakuje i wysyła paczki. Każdy sklep ma dostęp tylko do swoich produktów, stanów i zamówień.

Poza zakresem: płatności, faktury, integracje z kurierami (numer przesyłki wpisywany ręcznie), lokalizacje magazynowe (półki, regały), wiele magazynów.

## 2. Role i uprawnienia

| Akcja | ADMIN | WAREHOUSE (magazynier) | SHOP (sklep) |
|---|---|---|---|
| Użytkownicy: CRUD | ✅ | – | – |
| Sklepy: CRUD | ✅ | podgląd | podgląd swojego |
| Produkty: lista / szczegóły | wszystkie | wszystkie | tylko swoje |
| Produkty: dodawanie / edycja / usuwanie | ✅ | – | tylko swoje |
| Przyjęcie dostawy (zwiększenie stanu) | ✅ | ✅ | – |
| Korekta stanu (inwentaryzacja) | ✅ | ✅ | – |
| Historia ruchów magazynowych | wszystkie | wszystkie | tylko swoje produkty |
| Zamówienia: lista / szczegóły | wszystkie | wszystkie | tylko swoje |
| Zamówienia: tworzenie | ✅ (dla wybranego sklepu) | – | tylko dla siebie |
| Zamówienia: zmiana statusu (kompletacja, pakowanie, wysyłka) | ✅ | ✅ | – |
| Zamówienia: anulowanie | ✅ | ✅ | tylko swoje i tylko w statusie NEW |

Użytkownik z rolą SHOP ma przypisane `shop_id`. Pozostałe role mają `shop_id = null`.
Brak tokenu → 401. Token jest, ale brak uprawnień → 403. Zasób innego sklepu dla roli SHOP → **404**, a nie 403 (nie ujawniamy, że zasób istnieje).

## 3. Model danych (7 encji)

```mermaid
erDiagram
    SHOPS ||--o{ USERS : "ma kont"
    SHOPS ||--o{ PRODUCTS : "posiada"
    SHOPS ||--o{ ORDERS : "składa"
    PRODUCTS ||--o{ STOCK_MOVEMENTS : "historia"
    PRODUCTS ||--o{ ORDER_ITEMS : "w pozycjach"
    ORDERS ||--|{ ORDER_ITEMS : "zawiera"
    ORDERS ||--o| SHIPMENTS : "wysłane jako"
    USERS ||--o{ STOCK_MOVEMENTS : "wykonał"

    SHOPS { int id PK; string name; string contact_email; boolean is_active; timestamptz created_at }
    USERS { int id PK; string email UK; string password_hash; string role; int shop_id FK "null dla ADMIN/WAREHOUSE"; boolean is_active; timestamptz created_at }
    PRODUCTS { int id PK; int shop_id FK; string sku; string name; string ean "nullable"; int quantity_on_hand; int quantity_reserved; int low_stock_threshold; int version; timestamptz created_at; timestamptz updated_at }
    STOCK_MOVEMENTS { int id PK; int product_id FK; string type; int quantity "ze znakiem"; string reason "nullable"; int order_id FK "nullable"; int user_id FK "nullable"; timestamptz created_at }
    ORDERS { int id PK; int shop_id FK; string external_ref "nr zamówienia w sklepie"; string status; string recipient_name; string recipient_address; string recipient_email "nullable"; timestamptz created_at; timestamptz cancelled_at "nullable" }
    ORDER_ITEMS { int id PK; int order_id FK; int product_id FK; int quantity }
    SHIPMENTS { int id PK; int order_id FK UK; string carrier; string tracking_number; timestamptz shipped_at }
```

Ograniczenia w bazie:
- `products`: `UNIQUE (shop_id, sku)`, `CHECK (quantity_on_hand >= 0)`, `CHECK (quantity_reserved >= 0)`, `CHECK (quantity_reserved <= quantity_on_hand)`.
- `orders`: `UNIQUE (shop_id, external_ref)`.
- `order_items`: `CHECK (quantity > 0)`, `UNIQUE (order_id, product_id)`.
- `users.role IN ('ADMIN','WAREHOUSE','SHOP')`. Dla SHOP `shop_id` jest wymagane, dla pozostałych ról `NULL` (CHECK).
- `stock_movements.type IN ('RECEIPT','ADJUSTMENT','RESERVATION','RELEASE','SHIPMENT')`.

Stan dostępny = `quantity_on_hand - quantity_reserved` (wyliczany, nie przechowywany).

## 4. Reguły biznesowe
Wszystkie reguły są w services, każda ma testy jednostkowe.

1. **Rezerwacja stanu przy zamówieniu.** Utworzenie zamówienia sprawdza dla każdej pozycji, czy `dostępne >= quantity`. Jeśli którejkolwiek pozycji brakuje, odrzucamy całe zamówienie: 409 `INSUFFICIENT_STOCK`, w `details` lista brakujących SKU (dostępne / żądane). Jeśli wszystko jest dostępne, `quantity_reserved += qty` i wpis `RESERVATION`. Całość w jednej transakcji z `SELECT ... FOR UPDATE`, żeby dwa równoległe zamówienia nie zarezerwowały tego samego towaru.
2. **Pozycje zamówienia należą do sklepu zamówienia.** Produkt z innego sklepu daje 400 `PRODUCT_NOT_IN_SHOP`. Duplikaty SKU w jednym zamówieniu dają 400.
3. **Cykl życia zamówienia (state machine zapisana jako dane):**
   ```
   NEW → PICKING → PACKED → SHIPPED
   NEW → CANCELLED, PICKING → CANCELLED, PACKED → CANCELLED
   SHIPPED, CANCELLED – stany końcowe
   ```
   Niedozwolone przejście daje 409 `INVALID_STATUS_TRANSITION`. Ponowne ustawienie tego samego statusu zwraca 200 bez zmian (idempotencja).
4. **Wysyłka.** `PACKED → SHIPPED` wymaga `carrier` i `trackingNumber` (tworzy rekord `shipments`). Dla każdej pozycji `quantity_on_hand -= qty`, `quantity_reserved -= qty` oraz wpis `SHIPMENT`. Wszystko w transakcji. Po commicie emitowane jest zdarzenie `order.shipped`.
5. **Anulowanie zwalnia rezerwację.** `quantity_reserved -= qty`, wpis `RELEASE`, ustawienie `cancelled_at`. Sklep (SHOP) może anulować tylko w statusie `NEW`, inaczej 409 `ORDER_ALREADY_IN_PROGRESS`. Wysłanego zamówienia nie da się anulować.
6. **Korekta stanu nie może zejść poniżej rezerwacji.** Nowy `quantity_on_hand < quantity_reserved` daje 409 `STOCK_BELOW_RESERVED`. Korekta wymaga `reason`. Przyjęcie dostawy (`RECEIPT`) musi mieć quantity > 0.
7. **Usuwanie produktu.** Produktu, który ma jakiekolwiek ruchy magazynowe albo pozycje zamówień, nie można usunąć: 409 `PRODUCT_IN_USE`. Usunąć da się tylko produkt bez historii.
8. **Niski stan.** Gdy po zmianie stan dostępny spada poniżej `low_stock_threshold`, emitowane jest zdarzenie `stock.low` (raz przy przekroczeniu progu, nie przy każdej zmianie poniżej).

Na 5.0 wymagane są min. 3 reguły. Mamy ich więcej, ale na demo pokazujemy reguły 1, 3 i 6.

## 5. Mechanizm asynchroniczny i element rozszerzony
- **Event bus**: `events/eventBus.js` oparty o Node `EventEmitter` („event system dostępny w wybranym frameworku” z regulaminu). Services emitują zdarzenia domenowe dopiero po commicie transakcji. Handlery działają asynchronicznie, a ich błąd jest logowany i nie psuje requestu.
  - `order.shipped` → mail do sklepu (`shops.contact_email`) z numerem przesyłki oraz, jeśli podano, do odbiorcy (`recipient_email`).
  - `stock.low` → mail do sklepu i do magazynu z listą produktów.
- **Element rozszerzony: wysyłanie e-maili** (Nodemailer + Mailpit w docker-compose). Ma realne zastosowanie i daje się pokazać na demo w UI Mailpita.
- **CI w GitHub Actions** (`.github/workflows/ci.yml`): testy backendu na Postgresie i build frontendu przy każdym pushu. ✅

## 6. REST API
Prefiks `/api`. Wszystko oprócz logowania wymaga `Authorization: Bearer <token>`.

**Auth**
- `POST /auth/login` – `{ email, password }` → `{ accessToken, user }` (JWT, ważny np. 8 h)
- `GET /auth/me` – zalogowany użytkownik

**Users** (ADMIN)
- `GET /users` (paginacja, filtr `role`, `q`) · `POST /users` · `GET /users/:id` · `PATCH /users/:id` · `DELETE /users/:id` (dezaktywacja)

**Shops**
- `GET /shops` · `GET /shops/:id` · `POST /shops` · `PATCH /shops/:id` · `DELETE /shops/:id` (ADMIN; usunięcie tylko bez produktów i zamówień, inaczej 409)

**Products**
- `GET /products?page&pageSize&q&shopId&lowStock=true&sort` – **paginacja + wyszukiwanie + filtrowanie**. Odpowiedź: `{ data, page, pageSize, total }`
- `GET /products/:id` · `POST /products` · `PATCH /products/:id` · `DELETE /products/:id`

**Stock**
- `POST /products/:id/receipts` – `{ quantity, reason? }` (ADMIN, WAREHOUSE)
- `POST /products/:id/adjustments` – `{ newQuantityOnHand, reason }` (ADMIN, WAREHOUSE)
- `GET /products/:id/movements?page&pageSize` – historia ruchów

**Orders**
- `GET /orders?page&pageSize&status&shopId&q` (q po `external_ref` / odbiorcy)
- `GET /orders/:id` – z pozycjami i przesyłką
- `POST /orders` – `{ shopId?, externalRef, recipientName, recipientAddress, recipientEmail?, items: [{ productId, quantity }] }` → 201 + `Location`
- `PATCH /orders/:id/status` – `{ status: "PICKING" | "PACKED" }`
- `POST /orders/:id/ship` – `{ carrier, trackingNumber }` → status SHIPPED
- `POST /orders/:id/cancel`

**Inne**
- `GET /dashboard/summary` – liczba zamówień per status, liczba produktów z niskim stanem (dla SHOP tylko swoje)
- `GET /health` – healthcheck dla Docker Compose
- `GET /api/docs` – Swagger UI

## 7. Frontend (Angular)
Layout: boczne menu zależne od roli, górny pasek z nazwą użytkownika i wylogowaniem. Błędy API są pokazywane w snackbarze z `message` z odpowiedzi, błędy walidacji przy polach formularza.

| Ekran | Role | Zawartość |
|---|---|---|
| Logowanie | wszyscy | e-mail + hasło, obsługa błędu 401 |
| Dashboard | wszyscy | kafelki: zamówienia per status, niski stan, ostatnie zamówienia |
| Produkty – lista | wszyscy | tabela z paginacją, wyszukiwarka, filtr sklepu (ADMIN/WAREHOUSE), filtr „niski stan”; kolumny: SKU, nazwa, na stanie, zarezerwowane, dostępne |
| Produkt – formularz | ADMIN, SHOP | dodawanie / edycja, usuwanie z potwierdzeniem |
| Produkt – szczegóły | wszyscy | dane + historia ruchów; przyciski „Przyjęcie dostawy” i „Korekta” (ADMIN/WAREHOUSE) |
| Zamówienia – lista | wszyscy | tabela z paginacją, filtr statusu i sklepu, wyszukiwarka |
| Zamówienie – nowe | ADMIN, SHOP | dane odbiorcy + dynamiczna lista pozycji (wybór produktu, ilość, podgląd dostępności) |
| Zamówienie – szczegóły | wszyscy | pozycje, status, przyciski dozwolonych przejść (z state machine), formularz wysyłki, anulowanie |
| Sklepy | ADMIN (CRUD), inni podgląd | lista + formularz |
| Użytkownicy | ADMIN | lista + formularz (rola, przypisany sklep) |

Technicznie:
- `AuthService` trzyma token w `localStorage` i zalogowanego użytkownika w signal.
- `HttpInterceptor` dokleja Bearer, a przy 401 wylogowuje.
- `authGuard` i `roleGuard` na trasach. Menu i przyciski ukrywane zależnie od roli. Backend i tak to egzekwuje.
- Wymagane CRUD-y na 5.0: listowanie, dodawanie, edycja i usuwanie (produkty, sklepy, użytkownicy) oraz obsługa błędów API.

## 8. Testy
- **Jednostkowe (min. 5, celujemy w ~15):** services z fake repositories i zamrożonym `now`. Obowiązkowo:
  - rezerwacja OK / brak stanu / produkt z innego sklepu;
  - wszystkie przejścia state machine, dozwolone i niedozwolone;
  - anulowanie zwalnia rezerwację, a SHOP nie może anulować po NEW;
  - wysyłka zdejmuje stan;
  - korekta poniżej rezerwacji;
  - zdarzenie `stock.low` przy przekroczeniu progu.
- **Integracyjne (min. 3, celujemy w ~8):** Supertest na `createApp()` + testowa baza PostgreSQL (migracje przed testami, czyszczenie między testami). Obowiązkowo:
  - login i 401;
  - SHOP widzi tylko swoje zamówienia (404 na cudze);
  - POST /orders → 201 i zmiana stanu w bazie;
  - 409 `INSUFFICIENT_STOCK`;
  - paginacja produktów;
  - 403 dla SHOP na receipts.

## 9. Docker Compose i konfiguracja
- Serwisy:
  - `db` (postgres:17, volume, healthcheck);
  - `backend` (czeka na zdrowe `db`, przy starcie uruchamia `migrate:latest`, opcjonalnie seed);
  - `frontend` (build Angulara serwowany przez nginx, proxy `/api` → backend);
  - `mailpit` (porty 1025/8025).
- `.env.example`: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`, `PORT`, `CORS_ORIGIN`. `config.js` waliduje je Zodem przy starcie i przerywa start, gdy czegoś brakuje.
- Seed demo:
  - 2 sklepy, 15–20 produktów, kilka zamówień w różnych statusach, 1 produkt poniżej progu;
  - konta: `admin@fulfillhub.local`, `magazyn@fulfillhub.local`, `sklep1@fulfillhub.local`, `sklep2@fulfillhub.local` (hasła tylko dla danych demo, opisane w README).

## 10. Checklista wymagań z regulaminu

**3.0**
- [x] Backend + REST API + PostgreSQL, trwały zapis *(E1)*
- [x] ≥ 3 encje, ≥ 1 relacja (mamy 7) *(E1)*
- [x] CRUD głównych zasobów, poprawne metody HTTP i kody odpowiedzi *(E1 + E2: users)*
- [x] Warstwy: routes/controller, service, repository *(E0 szkielet, E1 wszystkie moduły)*
- [x] DTO (mappery) oddzielające API od modelu bazy *(E1)*
- [x] Walidacja wejścia (Zod) *(E1)*
- [x] Globalna obsługa błędów *(E0)*
- [x] ≥ 1 reguła biznesowa poza CRUD *(E1: reguły 1–7)*

**4.0**
- [x] Authentication (JWT) + authorization *(E2)*
- [x] ≥ 2 role (mamy 3), ograniczenia endpointów zależne od roli i właściciela *(E2)*
- [x] Paginacja (products, orders, users, movements) *(E1 + E2: users)*
- [x] Wyszukiwanie / filtrowanie *(E1: q, shopId, status, lowStock, sort)*
- [x] Swagger / OpenAPI *(E2: /api/docs)*
- [x] ≥ 5 testów jednostkowych logiki biznesowej *(E1–E2: 35 testów jednostkowych)*
- [x] ≥ 3 testy integracyjne REST API *(E2: 28 testów na bazie testowej)*
- [x] Migracje (Knex) *(E0: shops, users; E1: pozostałe tabele)*
- [x] Konfiguracja przez env, brak sekretów w repo *(E0)*

**5.0**
- [x] ≥ 5 powiązanych encji w spójnym modelu *(E1: 7 tabel)*
- [x] ≥ 3 reguły biznesowe *(E1: reguły 1–7; E4: reguła 8)*
- [x] Frontend (Angular) komunikujący się z API, logowanie i auth po stronie frontu *(E3)*
- [x] Listowanie, dodawanie, edycja, usuwanie i obsługa błędów API w UI *(E3)*
- [x] Mechanizm asynchroniczny (event bus) *(E4)*
- [x] Testy najważniejszej logiki *(E4: 74 testy razem)*
- [x] Docker Compose z osobnymi kontenerami dla backendu i bazy *(E0)*
- [x] README pozwalające uruchomić projekt innej osobie *(E4)*
- [x] Element rozszerzony z realnym użyciem (e-maile przez Mailpit) *(E4)*

**Wymagania formalne**
- [ ] Repo GitHub *(jest: Buczek05/fulfillhub)*, tag wersji oddawanej (np. `v1.0`)
- [ ] Historia commitów pokazująca rozwój
- [ ] README: opis, technologie, instrukcja uruchomienia, główne funkcjonalności
- [x] ERD (Mermaid w `docs/` i w README) *(E4: docs/ERD.md)*
- [x] Dokumentacja REST API (Swagger + link w README) *(E2/E4)*
- [ ] Demo video 3–5 min

## 11. Etapy realizacji
**Termin: 14.11.2026** – przedostatnie zajęcia projektowe ZTPAI (online, 10:45). Projekt ma być oddany przed zajęciami, czyli najpóźniej 13.11 wieczorem: tag `v1.0`, README i nagrane demo. Ostatnie zajęcia (21.11) zostają jako bufor.

| Etap | Do kiedy | Zakres | Gotowe, gdy |
|---|---|---|---|
| **E0 – Setup** ✅ | 19.10 | monorepo, docker-compose (db + mailpit), szkielet Express wg architektury, config, Knex, pierwsza migracja, error handling, requestLogger | `docker compose up` stawia bazę, `/api/health` zwraca 200 |
| **E1 – Rdzeń na 3.0** ✅ | 24.10 | migracje wszystkich tabel, moduły shops, products (CRUD), stock (receipts, adjustments, movements), orders (create z rezerwacją, status, ship, cancel), mappery, walidacja | sekcja 3.0 odhaczona, reguły 1–6 działają |
| **E2 – Na 4.0** ✅ | 31.10 | auth JWT, role i własność danych, paginacja i filtry, Swagger, testy jednostkowe i integracyjne, seed demo | sekcja 4.0 odhaczona, `npm test` zielone |
| **E3 – Frontend** ✅ | 8.11 | Angular: logowanie, layout, wszystkie ekrany z sekcji 7, obsługa błędów | pełny scenariusz demo przeklikany w UI |
| **E4 – Na 5.0** ✅ | 11.11 | event bus + maile (Mailpit), reguła 8, frontend i backend w compose, README, ERD, opcjonalnie CI | sekcja 5.0 odhaczona, czysty klon repo uruchamia się według README |
| **E5 – Oddanie** | 13.11 | poprawki, tag `v1.0`, nagranie demo | wymagania formalne odhaczone |

## 12. Scenariusz demo (3–5 min)
1. Logowanie jako sklep: lista produktów z paginacją i wyszukiwaniem, dodanie produktu.
2. Złożenie zamówienia: widać rezerwację stanu. Próba zamówienia większej ilości daje komunikat `INSUFFICIENT_STOCK`.
3. Logowanie jako magazynier: zamówienie przechodzi PICKING → PACKED → wysyłka z numerem przesyłki. Stan maleje, a w Mailpicie pojawia się mail do sklepu.
4. Korekta stanu poniżej rezerwacji daje błąd 409. Spadek poniżej progu wysyła mail o niskim stanie.
5. Swagger, testy (`npm test`), krótkie omówienie: przepływ request → route → controller → service → repository → DB, ERD, JWT i role.
