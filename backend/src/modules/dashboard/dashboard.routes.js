const { Router } = require("express");

function createDashboardRouter(dashboardController) {
  const router = Router();

  router.get("/summary", dashboardController.getSummary);

  return router;
}

module.exports = { createDashboardRouter };
