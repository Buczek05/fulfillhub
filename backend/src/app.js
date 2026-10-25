const express = require("express");
const swaggerUi = require("swagger-ui-express");

const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { createCors } = require("./middleware/cors");
const { createAuthenticate } = require("./middleware/authenticate");
const { openapi } = require("./docs/openapi");

const { createHealthService } = require("./modules/health/health.service");
const { createHealthController } = require("./modules/health/health.controller");
const { createHealthRouter } = require("./modules/health/health.routes");

const { createAuthService } = require("./modules/auth/auth.service");
const { createAuthController } = require("./modules/auth/auth.controller");
const { createAuthRouter } = require("./modules/auth/auth.routes");

const { createUsersService } = require("./modules/users/users.service");
const { createUsersController } = require("./modules/users/users.controller");
const { createUsersRouter } = require("./modules/users/users.routes");

const { createShopsService } = require("./modules/shops/shops.service");
const { createShopsController } = require("./modules/shops/shops.controller");
const { createShopsRouter } = require("./modules/shops/shops.routes");

const { createProductsService } = require("./modules/products/products.service");
const { createProductsController } = require("./modules/products/products.controller");
const { createProductsRouter } = require("./modules/products/products.routes");

const { createStockService } = require("./modules/stock/stock.service");
const { createStockController } = require("./modules/stock/stock.controller");
const { createStockRouter } = require("./modules/stock/stock.routes");

const { createOrdersService } = require("./modules/orders/orders.service");
const { createOrdersController } = require("./modules/orders/orders.controller");
const { createOrdersRouter } = require("./modules/orders/orders.routes");

const { createDashboardService } = require("./modules/dashboard/dashboard.service");
const { createDashboardController } = require("./modules/dashboard/dashboard.controller");
const { createDashboardRouter } = require("./modules/dashboard/dashboard.routes");

// Buduje aplikację z wstrzykniętych zależności, ale jej nie uruchamia (listen jest w server.js).
function createApp({
  config,
  db,
  usersRepository,
  shopsRepository,
  productsRepository,
  stockRepository,
  ordersRepository,
  dashboardRepository,
  tokenService,
  passwordHasher,
  now = () => new Date(),
}) {
  const app = express();

  app.use(requestLogger);
  app.use(createCors({ origin: config.corsOrigin }));
  app.use(express.json());

  const healthService = createHealthService({ db, now });
  const authService = createAuthService({ usersRepository, tokenService, passwordHasher });
  const usersService = createUsersService({ usersRepository, shopsRepository, passwordHasher });
  const shopsService = createShopsService({ shopsRepository, productsRepository, ordersRepository });
  const productsService = createProductsService({ productsRepository, shopsRepository });
  const stockService = createStockService({ db, productsRepository, stockRepository, now });
  const ordersService = createOrdersService({
    db,
    ordersRepository,
    productsRepository,
    shopsRepository,
    stockRepository,
    now,
  });
  const dashboardService = createDashboardService({ dashboardRepository });

  const authenticate = createAuthenticate({ tokenService, usersRepository });

  // Publiczne: healthcheck, dokumentacja i logowanie.
  app.use("/api/health", createHealthRouter(createHealthController(healthService)));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "FulfillHub API" }));
  app.use("/api/auth", createAuthRouter(createAuthController(authService), authenticate));

  // Reszta wymaga tokenu; rolę sprawdza authorize(...) w poszczególnych trasach.
  app.use("/api/users", authenticate, createUsersRouter(createUsersController(usersService)));
  app.use("/api/shops", authenticate, createShopsRouter(createShopsController(shopsService)));
  app.use("/api/products", authenticate, createProductsRouter(createProductsController(productsService)));
  // Stany magazynowe to podzasób produktu: /api/products/:id/receipts itd.
  app.use("/api/products", authenticate, createStockRouter(createStockController(stockService)));
  app.use("/api/orders", authenticate, createOrdersRouter(createOrdersController(ordersService)));
  app.use(
    "/api/dashboard",
    authenticate,
    createDashboardRouter(createDashboardController(dashboardService)),
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
