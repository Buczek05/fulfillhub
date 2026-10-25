const knex = require("knex");
const path = require("node:path");

// Jedna konfiguracja połączenia dla aplikacji i dla CLI Knexa (knexfile.js).
function knexConfig(config) {
  return {
    client: "pg",
    connection: config.database.url,
    pool: { min: 0, max: 10 },
    migrations: {
      directory: path.join(__dirname, "migrations"),
      tableName: "knex_migrations",
    },
    seeds: { directory: path.join(__dirname, "seeds") },
  };
}

function createKnex(config) {
  return knex(knexConfig(config));
}

module.exports = { knexConfig, createKnex };
