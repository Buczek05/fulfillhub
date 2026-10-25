const express = require("express");

const requestLogger = require("./middleware/requestLogger");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const { createHealthService } = require("./modules/health/health.service");
const { createHealthController } = require("./modules/health/health.controller");
const { createHealthRouter } = require("./modules/health/health.routes");

// Buduje aplikację z wstrzykniętych zależności, ale jej nie uruchamia (listen jest w server.js).
function createApp({ db, now = () => new Date() }) {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());

  const healthService = createHealthService({ db, now });

  app.use("/api/health", createHealthRouter(createHealthController(healthService)));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
