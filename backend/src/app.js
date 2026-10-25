const express = require("express");

const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const { createHealthService } = require("./modules/health/health.service");
const { createHealthController } = require("./modules/health/health.controller");
const { createHealthRouter } = require("./modules/health/health.routes");

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

// Buduje aplikację z wstrzykniętych zależności, ale jej nie uruchamia (listen jest w server.js).
function createApp({ db, shopsRepository, productsRepository, stockRepository, ordersRepository, now = () => new Date() }) {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());

  const healthService = createHealthService({ db, now });
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

  app.use("/api/health", createHealthRouter(createHealthController(healthService)));
  app.use("/api/shops", createShopsRouter(createShopsController(shopsService)));
  app.use("/api/products", createProductsRouter(createProductsController(productsService)));
  // Stany magazynowe to podzasób produktu: /api/products/:id/receipts itd.
  app.use("/api/products", createStockRouter(createStockController(stockService)));
  app.use("/api/orders", createOrdersRouter(createOrdersController(ordersService)));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
