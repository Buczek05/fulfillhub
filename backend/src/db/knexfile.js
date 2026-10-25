const { loadConfig } = require("../config");
const { knexConfig } = require("./knex");

// Używane przez CLI: npm run migrate / npm run seed
module.exports = knexConfig(loadConfig());
