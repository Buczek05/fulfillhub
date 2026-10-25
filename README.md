# FulfillHub – system obsługi magazynu fulfillment

Projekt zaliczeniowy z przedmiotu **ZTPAI** (Politechnika Krakowska, sem. zimowy 2026/27).
Autor: Kacper Bukowski.

Mini-WMS dla magazynu fulfillment: sklepy internetowe trzymają towar w magazynie, a magazyn
kompletuje, pakuje i wysyła ich zamówienia. Sklep widzi wyłącznie swoje produkty, stany i zamówienia.

## Technologie
| Warstwa | Technologia |
|---|---|
| Backend | Node.js 22, Express 5, Zod 4 |
| Baza danych | PostgreSQL 17, Knex (migracje) |
| Frontend | Angular 22 (standalone components, signals) + Angular Material |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Dokumentacja API | OpenAPI 3 + Swagger UI |
| Testy | Vitest + Supertest |
| Poczta | Nodemailer → Mailpit |
| Uruchomienie | Docker Compose |

## Uruchomienie (Docker Compose)
Wymagany Docker z pluginem Compose.

```bash
cp .env.example .env
docker compose up --build
```

Po starcie:

| Adres | Co to |
|---|---|
| http://localhost:4200 | **aplikacja (Angular)** |
| http://localhost:3000/api/health | healthcheck API |
| http://localhost:3000/api/docs | Swagger UI – dokumentacja API |
| http://localhost:8025 | Mailpit – podgląd wysłanych maili |
| `localhost:5432` | PostgreSQL (użytkownik i baza z `.env`) |

Migracje uruchamiają się automatycznie przy starcie kontenera `backend`.

Zatrzymanie (`-v` kasuje też dane bazy):

```bash
docker compose down -v
```

## Ekrany aplikacji

| Ekran | Kto widzi | Co robi |
|---|---|---|
| Logowanie | wszyscy | e-mail i hasło, obsługa błędnych danych |
| Pulpit | wszyscy | kafelki zamówień per status, licznik niskiego stanu, ostatnie zamówienia |
| Produkty | wszyscy | tabela z paginacją, wyszukiwarką, filtrem sklepu i „niski stan” |
| Produkt – formularz | ADMIN, SHOP | dodawanie i edycja, usuwanie z potwierdzeniem |
| Produkt – szczegóły | wszyscy | stany, historia ruchów, przyjęcie dostawy i korekta (ADMIN, WAREHOUSE) |
| Zamówienia | wszyscy | tabela z paginacją, filtr statusu i sklepu, wyszukiwarka |
| Zamówienie – nowe | ADMIN, SHOP | dane odbiorcy i dynamiczna lista pozycji z podglądem dostępności |
| Zamówienie – szczegóły | wszyscy | przyciski dozwolonych przejść, wysyłka, anulowanie |
| Sklepy | ADMIN edytuje, reszta podgląd | lista i formularz |
| Użytkownicy | ADMIN | lista, zakładanie kont, dezaktywacja |

Token JWT trzymany jest w `localStorage`, a zalogowany użytkownik w signalu. `HttpInterceptor`
dokleja nagłówek `Authorization`, a odpowiedź 401 wylogowuje. Menu i przyciski chowają się zależnie
od roli — uprawnień pilnuje jednak backend, front tylko oszczędza użytkownikowi ekranu z błędem.
Błędy API lądują w snackbarze z komunikatem po polsku; przy braku stanu pokazujemy, czego i ile brakuje.

## Uruchomienie frontendu lokalnie

```bash
docker compose up -d db mailpit backend
cd frontend
npm install
npm start           # http://localhost:4200, /api proxowane na localhost:3000
```

## Uruchomienie backendu lokalnie
Baza i Mailpit nadal z Dockera, sam backend z `node --watch`:

```bash
docker compose up -d db mailpit
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev
```

## Dane demo
Po uruchomieniu wypełnij bazę danymi demo (2 sklepy, 18 produktów, 6 zamówień w różnych statusach,
1 produkt poniżej progu):

```bash
docker compose exec backend npm run seed
```

Konta demo – hasło dla wszystkich: `haslo123` (to tylko dane demo, nie używaj ich poza lokalnym uruchomieniem):

| E-mail | Rola | Co widzi |
|---|---|---|
| `admin@fulfillhub.local` | ADMIN | wszystko, łącznie z kontami użytkowników |
| `magazyn@fulfillhub.local` | WAREHOUSE | produkty i zamówienia wszystkich sklepów, przyjęcia i korekty |
| `sklep1@fulfillhub.local` | SHOP | wyłącznie dane sklepu „Papeteria Alfa” |
| `sklep2@fulfillhub.local` | SHOP | wyłącznie dane sklepu „Kawiarnia Beta” |

Logowanie zwraca token JWT, który dokładamy do każdego kolejnego żądania:

```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@fulfillhub.local","password":"haslo123"}'
```

## Role i dostęp do danych

| Akcja | ADMIN | WAREHOUSE | SHOP |
|---|---|---|---|
| Konta użytkowników | ✅ | – | – |
| Sklepy: dodawanie, edycja, usuwanie | ✅ | – | – |
| Produkty: podgląd | wszystkie | wszystkie | tylko swoje |
| Produkty: dodawanie, edycja, usuwanie | ✅ | – | tylko swoje |
| Przyjęcia i korekty stanu | ✅ | ✅ | – |
| Zamówienia: podgląd | wszystkie | wszystkie | tylko swoje |
| Zamówienia: składanie | ✅ | – | tylko dla siebie |
| Zamówienia: kompletacja i wysyłka | ✅ | ✅ | – |
| Zamówienia: anulowanie | ✅ | ✅ | tylko swoje, tylko w statusie NEW |

Brak tokenu → 401. Token jest, ale rola nie pozwala → 403. Zasób innego sklepu dla roli SHOP → **404**,
a nie 403: nie zdradzamy, że taki rekord w ogóle istnieje.

## Testy

```bash
cd backend
npm test                  # wszystko: jednostkowe + integracyjne
npm run test:unit         # same jednostkowe (nie potrzebują bazy)
npm run test:integration  # integracyjne (wymagają uruchomionej bazy)
```

Testy integracyjne same tworzą bazę `fulfillhub_test` obok bazy aplikacji i uruchamiają na niej
migracje, więc dane demo zostają nietknięte. Wymagają działającego kontenera `db`
(`docker compose up -d db`).

## Przydatne komendy

| Komenda (w `backend/`) | Działanie |
|---|---|
| `npm run dev` | serwer z automatycznym restartem |
| `npm start` | serwer produkcyjnie |
| `npm test` | testy (Vitest) |
| `npm run migrate` | `knex migrate:latest` |
| `npm run migrate:rollback` | cofnięcie ostatniej migracji |
| `npm run migrate:make <nazwa>` | nowa migracja |
| `npm run seed` | dane demo |

## Konfiguracja
Wszystkie ustawienia idą przez zmienne środowiskowe, walidowane Zodem w `backend/src/config.js` –
brak wymaganej zmiennej przerywa start aplikacji. Wzorce: `.env.example` (Docker Compose)
i `backend/.env.example` (uruchomienie lokalne). Pliki `.env` są w `.gitignore`.

## Struktura repozytorium

```
frontend/         – aplikacja Angular (nginx + proxy /api w kontenerze)
  src/app/
    core/         – modele API, serwisy HTTP, auth, obsługa błędów
    layout/       – szkielet z menu zależnym od roli
    features/     – ekrany: login, pulpit, produkty, zamówienia, sklepy, użytkownicy
    shared/       – wspólne okna dialogowe
backend/          – REST API (Express)
  src/
    app.js        – createApp(deps): buduje aplikację, nie uruchamia serwera
    server.js     – composition root: config, połączenie z bazą, listen
    config.js     – walidacja zmiennych środowiskowych (Zod)
    buildApp.js   – składa aplikację z prawdziwych repositories (server i testy)
    db/           – knexfile, migracje, seedy
    docs/         – specyfikacja OpenAPI
    errors/       – błędy domenowe (AppError i pochodne)
    middleware/   – requestLogger, cors, authenticate, authorize, validate, notFound, errorHandler
    modules/      – moduły: routes → controller → service → repository
    schemas/      – wspólne schematy Zod i zakres danych dla roli SHOP
  tests/
    unit/         – reguły biznesowe na fake repositories
    integration/  – Supertest na testowej bazie PostgreSQL
docs/PLAN.md      – pełny plan projektu: model danych, reguły, API, etapy
docker-compose.yml
```

## Endpointy

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/api/health` | healthcheck (200 / 503, gdy baza nie odpowiada) — bez tokenu |
| GET | `/api/docs` | Swagger UI — bez tokenu |
| POST | `/api/auth/login` | logowanie, zwraca `accessToken` i dane użytkownika — bez tokenu |
| GET | `/api/auth/me` | zalogowany użytkownik |
| GET POST | `/api/users` | konta użytkowników (ADMIN) |
| GET PATCH DELETE | `/api/users/:id` | szczegóły · edycja · dezaktywacja (ADMIN) |
| GET POST | `/api/shops` | lista z paginacją i wyszukiwaniem · dodanie sklepu |
| GET PATCH DELETE | `/api/shops/:id` | szczegóły · edycja · usunięcie (409, gdy sklep ma produkty lub zamówienia) |
| GET POST | `/api/products` | lista (`page`, `pageSize`, `q`, `shopId`, `lowStock`, `sort`) · dodanie produktu |
| GET PATCH DELETE | `/api/products/:id` | szczegóły · edycja · usunięcie (409, gdy produkt ma historię) |
| POST | `/api/products/:id/receipts` | przyjęcie dostawy |
| POST | `/api/products/:id/adjustments` | korekta stanu (wymaga `reason`) |
| GET | `/api/products/:id/movements` | historia ruchów magazynowych |
| GET POST | `/api/orders` | lista (`status`, `shopId`, `q`) · nowe zamówienie z rezerwacją stanu |
| GET | `/api/orders/:id` | szczegóły z pozycjami i przesyłką |
| PATCH | `/api/orders/:id/status` | `PICKING` / `PACKED` |
| POST | `/api/orders/:id/ship` | wysyłka: zdejmuje stan, tworzy przesyłkę |
| POST | `/api/orders/:id/cancel` | anulowanie: zwalnia rezerwację |
| GET | `/api/dashboard/summary` | zamówienia per status, liczba produktów z niskim stanem, ostatnie zamówienia |

Poza `/api/health`, `/api/docs` i `/api/auth/login` każdy endpoint wymaga nagłówka
`Authorization: Bearer <token>`. Pełna specyfikacja: [Swagger UI](http://localhost:3000/api/docs).

## Reguły biznesowe
Wszystkie siedzą w services i mają testy jednostkowe (`backend/tests/unit`):

1. **Rezerwacja stanu** – zamówienie rezerwuje towar; brak choćby jednej pozycji odrzuca całe
   zamówienie (409 `INSUFFICIENT_STOCK`). Rezerwacja idzie w transakcji z `SELECT ... FOR UPDATE`,
   więc dwa równoległe zamówienia nie zarezerwują tego samego towaru.
2. **Pozycje z własnego sklepu** – produkt obcego sklepu daje 400 `PRODUCT_NOT_IN_SHOP`.
3. **Cykl życia zamówienia** – `NEW → PICKING → PACKED → SHIPPED`, anulowanie przed wysyłką.
   Niedozwolone przejście: 409 `INVALID_STATUS_TRANSITION`; ten sam status ponownie: 200 bez zmian.
4. **Wysyłka** – zdejmuje stan, zwalnia rezerwację i tworzy przesyłkę w jednej transakcji.
5. **Anulowanie** – zwalnia rezerwację; sklep może anulować tylko w statusie `NEW`.
6. **Korekta stanu** – nie może zejść poniżej rezerwacji (409 `STOCK_BELOW_RESERVED`), wymaga powodu.
7. **Usuwanie produktu** – produkt z historią zostaje (409 `PRODUCT_IN_USE`).

## Format odpowiedzi błędu
Każdy błąd API ma ten sam kształt, a `code` jest stałym kontraktem:

```json
{
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Route GET /api/nope not found",
    "requestId": "7be2382a-7416-4d76-84b6-52fa34271cf2"
  }
}
```

## Stan prac
Projekt powstaje etapami opisanymi w [`docs/PLAN.md`](docs/PLAN.md) (sekcja 11).

- [x] **E0 – Setup**: monorepo, Docker Compose (db + mailpit + backend), szkielet Express, config, Knex, pierwsza migracja, obsługa błędów
- [x] **E1 – Rdzeń**: sklepy, produkty, stany magazynowe, zamówienia z rezerwacją stanu
- [x] **E2 – Auth i jakość**: JWT, role, własność danych, users, Swagger, testy integracyjne, seed demo
- [x] **E3 – Frontend**: Angular — logowanie, pulpit, produkty, zamówienia, sklepy, użytkownicy
- [ ] **E4 – Asynchroniczność**: event bus, maile, README, ERD
- [ ] **E5 – Oddanie**: tag `v1.0`, demo
