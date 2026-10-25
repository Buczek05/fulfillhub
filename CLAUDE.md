# FulfillHub – instrukcje dla Claude Code

Projekt zaliczeniowy z przedmiotu ZTPAI (Politechnika Krakowska, sem. zimowy 2026/27). Autor: Kacper Bukowski.
Mini-WMS dla magazynu fulfillment: sklepy internetowe trzymają towar w magazynie, magazyn kompletuje i wysyła ich zamówienia.

**Pełny plan, model danych, reguły, API i etapy: `docs/PLAN.md`.** Przeczytaj go przed rozpoczęciem pracy i trzymaj się kolejności etapów.

## Cel oceny
Celujemy w **5.0** wg regulaminu (checklista w `docs/PLAN.md`, sekcja 10). Wymagania z niższej oceny muszą działać, zanim przejdziemy do wyższej. Projekt ma być **możliwy do wyjaśnienia na demo** – autor musi umieć opowiedzieć przepływ requestu, model danych, auth i reguły biznesowe. Dlatego: prosto, czytelnie, bez magii i bez zbędnych bibliotek.

## Stack (ustalony)
- Backend: Node.js 22 LTS, Express 5, Zod 4, Knex + PostgreSQL 17, JWT (jsonwebtoken) + bcrypt
- Frontend: Angular (aktualna stabilna wersja, standalone components, signals), Angular Material
- Testy: Vitest + Supertest (backend); integracyjne na osobnej bazie testowej w Dockerze
- Dokumentacja API: OpenAPI 3 + swagger-ui-express pod `/api/docs`
- Maile: Nodemailer → Mailpit (kontener w docker-compose, podgląd na http://localhost:8025)
- Uruchomienie: Docker Compose (kontenery: db, backend, frontend, mailpit)

## Struktura repo
```
/backend      – Express API
/frontend     – Angular
/docs         – PLAN.md, ERD (Mermaid), notatki
docker-compose.yml
README.md
.env.example
```

## Architektura backendu (wzorzec z materiału 02 kursu – trzymać się go)
```
backend/src/
├── app.js            – createApp(deps): buduje aplikację, NIE woła listen
├── server.js         – composition root: config, knex, repositories, services, listen
├── config.js         – odczyt i walidacja zmiennych środowiskowych (Zod)
├── db/               – knexfile, migrations/, seeds/
├── errors/AppError.js – AppError, ValidationError(400), UnauthorizedError(401), ForbiddenError(403), NotFoundError(404), ConflictError(409)
├── events/           – eventBus (EventEmitter) + handlers (mail, low stock)
├── middleware/       – requestLogger, validate, authenticate, authorize, notFound, errorHandler
└── modules/<moduł>/  – <m>.routes.js, <m>.controller.js, <m>.service.js, <m>.repository.js, <m>.schemas.js, <m>.mapper.js
```
Zasady:
- **Routes** → URL + middleware (`authenticate`, `authorize(...)`, `validate({ params, query, body })`).
- **Controller** → tylko req/res, status code, mapper. Bez `try/catch` (Express 5 sam przekazuje odrzucone Promise), bez logiki biznesowej.
- **Service** → wszystkie reguły biznesowe. Nie importuje Expressa, nie dostaje req/res. Dostaje zależności jako parametry (`createOrdersService({ ordersRepository, productsRepository, db, eventBus, now })`). Rzuca błędy domenowe.
- **Repository** → jedyne miejsce z zapytaniami Knex. Zero reguł biznesowych. Zwraca zwykłe obiekty (camelCase).
- **Mapper** → whitelist pól w odpowiedzi (`toOrderResponse`); nigdy nie zwracamy `password_hash` ani surowych wierszy z bazy. Daty ISO 8601 UTC, braki jako `null`.
- **Walidacja** → Zod, `.strict()` na body (odrzuca nieznane pola), `z.coerce.number().int().positive()` dla `:id` i query. Middleware `validate` zbiera błędy z params/query/body naraz i ustawia `req.validated`.
- **Błędy** → jeden format: `{ "error": { "code", "message", "details?", "requestId" } }`. Stały `code` (np. `INSUFFICIENT_STOCK`) jest kontraktem API. 500 bez stack trace (stack tylko w logu). Nieznana ścieżka → 404 JSON. Zły JSON → 400 `INVALID_JSON`.
- **Czas** → `now = () => new Date()` wstrzykiwane do services (testowalność).
- Operacje zmieniające stany magazynowe → **zawsze w transakcji** z `SELECT ... FOR UPDATE` na wierszach produktów.

## Konwencje
- Kod, nazwy w bazie i API po angielsku. UI po polsku. Komentarze po polsku tylko tam, gdzie wyjaśniają regułę biznesową.
- Baza: snake_case; API/JS: camelCase (mapowanie w repository).
- Kody HTTP: 200/201 (+ nagłówek `Location`)/204, 400, 401, 403, 404, 409, 500.
- Sekrety tylko w `.env` (w `.gitignore`); w repo `.env.example` z bezpiecznymi wartościami przykładowymi.
- Bez TypeScriptu na backendzie (spójność z materiałami kursu); frontend w TypeScripcie (Angular).
- Backend w CommonJS (`require` / `module.exports`) – tak jak materiał 02 kursu. Wyjątek: pliki testów
  (`backend/tests/**`) używają `import`, bo Vitest nie daje się wczytać przez `require`; ESM i tak
  importuje moduły CommonJS bez problemu.

## Sposób pracy
- **Historia commitów jest oceniana** („historia commitów pokazująca rozwój projektu”). Commituj małymi krokami, po każdej działającej funkcji, opisowe wiadomości po angielsku w stylu Conventional Commits (`feat(orders): reserve stock on order creation`). Nie squashuj.
- Realizuj etapy z `docs/PLAN.md` po kolei. Po każdym etapie: testy przechodzą, `docker compose up` działa, odhacz checklistę w PLAN.md.
- Każdą nową regułę biznesową od razu pokryj testem jednostkowym service (fake repositories + zamrożone `now`).
- Nie dodawaj funkcji spoza planu bez pytania. Nie dodawaj bibliotek, jeśli coś da się zrobić w kilku liniach.
- Przy wątpliwościach co do wymagań – zapytaj, zamiast zgadywać.

## Komendy
```
cp .env.example .env               # raz, przed pierwszym uruchomieniem
docker compose up --build          # cała aplikacja (db + mailpit + backend)
docker compose up -d db mailpit    # sama infrastruktura, backend lokalnie
docker compose down -v             # stop + skasowanie danych bazy

cd backend && npm run dev          # backend lokalnie (wymaga backend/.env)
cd backend && npm test             # testy (Vitest)
cd backend && npm run migrate      # knex migrate:latest
cd backend && npm run seed         # dane demo
cd frontend && npm start           # frontend lokalnie (od E3)
```

Podgląd: API `http://localhost:3000/api/health`, Mailpit `http://localhost:8025`.
