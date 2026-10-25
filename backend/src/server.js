const { loadConfig } = require("./config");
const { createKnex } = require("./db/knex");
const { createApp } = require("./app");

// Composition root – jedyne miejsce, które tworzy config, połączenie z bazą i uruchamia serwer.
const config = loadConfig();
const db = createKnex(config);

const app = createApp({ db, now: () => new Date() });

const server = app.listen(config.port, () => {
  console.log(`FulfillHub API listening on http://localhost:${config.port} (${config.env})`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await db.destroy();
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
