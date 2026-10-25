const { Router } = require("express");

function createHealthRouter(healthController) {
  const router = Router();

  router.get("/", healthController.getHealth);

  return router;
}

module.exports = { createHealthRouter };
