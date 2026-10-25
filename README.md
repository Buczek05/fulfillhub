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
| Frontend | Angular (dojdzie w etapie E3) |
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
| http://localhost:3000/api/health | healthcheck API |
| http://localhost:8025 | Mailpit – podgląd wysłanych maili |
| `localhost:5432` | PostgreSQL (użytkownik i baza z `.env`) |

Migracje uruchamiają się automatycznie przy starcie kontenera `backend`.

Zatrzymanie (`-v` kasuje też dane bazy):

```bash
docker compose down -v
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

## Testy

```bash
cd backend
npm test
```

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
backend/          – REST API (Express)
  src/
    app.js        – createApp(deps): buduje aplikację, nie uruchamia serwera
    server.js     – composition root: config, połączenie z bazą, listen
    config.js     – walidacja zmiennych środowiskowych (Zod)
    db/           – knexfile, migracje, seedy
    errors/       – błędy domenowe (AppError i pochodne)
    middleware/   – requestLogger, notFound, errorHandler
    modules/      – moduły: routes → controller → service → repository
  tests/          – testy jednostkowe i integracyjne
docs/PLAN.md      – pełny plan projektu: model danych, reguły, API, etapy
docker-compose.yml
```

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
- [ ] **E1 – Rdzeń**: sklepy, produkty, stany magazynowe, zamówienia
- [ ] **E2 – Auth i jakość**: JWT, role, paginacja, Swagger, testy, seed
- [ ] **E3 – Frontend**: Angular
- [ ] **E4 – Asynchroniczność**: event bus, maile, README, ERD
- [ ] **E5 – Oddanie**: tag `v1.0`, demo
