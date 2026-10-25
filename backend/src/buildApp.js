const { createKnex } = require("./db/knex");
const { createApp } = require("./app");

const { createUsersRepository } = require("./modules/users/users.repository");
const { createShopsRepository } = require("./modules/shops/shops.repository");
const { createProductsRepository } = require("./modules/products/products.repository");
const { createStockRepository } = require("./modules/stock/stock.repository");
const { createOrdersRepository } = require("./modules/orders/orders.repository");
const { createDashboardRepository } = require("./modules/dashboard/dashboard.repository");
const { createTokenService } = require("./modules/auth/auth.token");
const { createPasswordHasher } = require("./modules/auth/auth.password");

// Składa aplikację z prawdziwych repositories. Używa tego server.js i testy integracyjne,
// żeby jedno i drugie uruchamiało dokładnie ten sam zestaw zależności.
function buildApp(config, { db = createKnex(config), now = () => new Date() } = {}) {
  const app = createApp({
    config,
    db,
    usersRepository: createUsersRepository({ db }),
    shopsRepository: createShopsRepository({ db }),
    productsRepository: createProductsRepository({ db }),
    stockRepository: createStockRepository({ db }),
    ordersRepository: createOrdersRepository({ db }),
    dashboardRepository: createDashboardRepository({ db }),
    tokenService: createTokenService(config.jwt),
    passwordHasher: createPasswordHasher(),
    now,
  });

  return { app, db };
}

module.exports = { buildApp };
