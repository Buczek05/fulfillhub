import knexFactory from "knex";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadConfig } = require("../../src/config.js");
const { buildApp } = require("../../src/buildApp.js");

const migrationsDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../src/db/migrations",
);

const TABLES = [
  "shipments",
  "stock_movements",
  "order_items",
  "orders",
  "products",
  "users",
  "shops",
];

// Testy integracyjne jadą na osobnej bazie: <nazwa>_test obok bazy aplikacji.
// Dzięki temu czyszczenie tabel między testami nie kasuje danych demo.
function testDatabaseUrl(databaseUrl) {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  const url = new URL(databaseUrl);
  url.pathname = `${url.pathname}_test`;

  return url.toString();
}

async function ensureDatabaseExists(databaseUrl) {
  const url = new URL(databaseUrl);
  const name = url.pathname.replace(/^\//, "");

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";

  const admin = knexFactory({ client: "pg", connection: adminUrl.toString() });
  try {
    const { rows } = await admin.raw("select 1 from pg_database where datname = ?", [name]);
    if (rows.length === 0) await admin.raw(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.destroy();
  }
}

let setupPromise;

// Jednorazowo na proces testowy: utworzenie bazy i migracje do najnowszej wersji.
function setupTestDatabase() {
  setupPromise ??= (async () => {
    const baseConfig = loadConfig();
    const databaseUrl = testDatabaseUrl(baseConfig.database.url);

    await ensureDatabaseExists(databaseUrl);

    const config = { ...baseConfig, env: "test", database: { url: databaseUrl } };
    const db = knexFactory({
      client: "pg",
      connection: databaseUrl,
      pool: { min: 0, max: 5 },
      migrations: { directory: migrationsDirectory, tableName: "knex_migrations" },
    });

    await db.migrate.latest();

    return { config, db };
  })();

  return setupPromise;
}

export async function createTestContext() {
  const { config, db } = await setupTestDatabase();
  const { app } = buildApp(config, { db });

  return { app, db, config };
}

export async function resetDatabase(db) {
  await db.raw(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

export async function closeTestDatabase() {
  if (!setupPromise) return;

  const { db } = await setupPromise;
  await db.destroy();
  setupPromise = undefined;
}
