# Scenariusz demo (3–5 min)

Ściąga do nagrania. Całość mieści się w pięciu minutach, jeśli nie opowiadasz o kodzie dłużej
niż go pokazujesz.

## Przygotowanie (przed nagraniem)

```bash
docker compose down -v          # czysty start, żeby liczby się zgadzały
docker compose up -d --build
docker compose exec backend npm run seed
```

Otwórz w kartach: http://localhost:4200 (aplikacja), http://localhost:8025 (Mailpit),
http://localhost:3000/api/docs (Swagger). Mailpit wyczyść przyciskiem „Delete all”.

Hasło do wszystkich kont demo: `haslo123`.

## 1. Sklep: produkty i zamówienie (~90 s)

Zaloguj się jako `sklep1@fulfillhub.local`.

- **Pulpit** — kafelki zamówień per status i licznik niskiego stanu. Powiedz jedno zdanie:
  *te liczby są policzone tylko na danych tego sklepu*.
- **Produkty** — pokaż paginację i wyszukiwarkę (wpisz `KUBEK`). Zwróć uwagę na trzy kolumny:
  na stanie, zarezerwowane, dostępne.
- **Nowe zamówienie** — wybierz `ALF-KUBEK-01`, wpisz ilość **9999** i zatwierdź.
  Pokaż komunikat: *brak wystarczającej ilości towaru, dostępne 118, żądane 9999*.
  To jest reguła 1 — zamówienie odrzucamy w całości, nic się nie rezerwuje.
- Zmień ilość na **5** i złóż zamówienie. Wróć do produktu i pokaż, że **zarezerwowane** wzrosło,
  a **na stanie** się nie zmieniło. Towar jest zablokowany, ale fizycznie leży w magazynie.

## 2. Magazyn: kompletacja i wysyłka (~90 s)

Wyloguj się, zaloguj jako `magazyn@fulfillhub.local`.

- Wejdź w to samo zamówienie. Zwróć uwagę, że przyciski są inne niż u sklepu — magazynier
  kompletuje, sklep tylko anuluje.
- Kliknij **Rozpocznij kompletację** → **Oznacz jako spakowane** → **Wyślij**
  (przewoźnik `InPost`, numer przesyłki dowolny).
- Pokaż **Mailpita**: przyszedł mail do sklepu z numerem przesyłki. Powiedz, że to zdarzenie
  domenowe wysyłane **po commicie transakcji**, obsługiwane asynchronicznie — gdyby mail nie
  poszedł, paczka i tak jest wysłana.
- Wróć do produktu: **na stanie** spadło o 5, **zarezerwowane** wróciło do poprzedniej wartości.
  Pokaż **historię ruchów** — widać całą ścieżkę: przyjęcie, rezerwacja, wysyłka.

## 3. Reguły i role (~60 s)

- Na produkcie kliknij **Korekta stanu** i wpisz wartość **mniejszą niż zarezerwowane**.
  Pokaż błąd 409: *nowy stan jest niższy niż ilość zarezerwowana*. To reguła 6 — nie da się
  „odpisać” towaru, który jest już komuś obiecany.
- Zrób korektę spychającą produkt poniżej progu niskiego stanu i pokaż w Mailpicie alert.
- Jedno zdanie o rolach: sklep nie widzi cudzych danych, a próba wejścia w cudzy produkt
  kończy się **404, nie 403** — nie zdradzamy, że taki rekord istnieje.

## 4. Pod maską (~60 s)

- **Swagger** (`/api/docs`) — pokaż `POST /orders` i listę kodów błędów.
- **Terminal**: `cd backend && npm test` — 74 testy (jednostkowe reguł biznesowych na atrapach
  repozytoriów plus integracyjne przez HTTP na osobnej bazie testowej).
- **ERD** (`docs/ERD.md`) — siedem encji, `shop_id` dzieli dane między sklepami.
- Jedno zdanie o przepływie requestu:
  `routes → controller → service → repository → PostgreSQL`,
  gdzie reguły biznesowe są wyłącznie w service, a repository to jedyne miejsce z zapytaniami.
- Jedno zdanie o rezerwacji: dzieje się w transakcji z `SELECT ... FOR UPDATE`, więc dwa
  równoległe zamówienia nie zarezerwują tego samego towaru.

## Czego nie pokazywać
Nie czytaj kodu linijka po linijce i nie tłumacz, jak działa Docker. Oceniany jest działający
system i to, czy umiesz wytłumaczyć **własne** decyzje projektowe.
