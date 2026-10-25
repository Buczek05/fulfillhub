const { loadConfig } = require("./config");
const { buildApp } = require("./buildApp");

// Composition root – czyta konfigurację, składa aplikację i uruchamia serwer.
const config = loadConfig();
const { app, db } = buildApp(config);

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
