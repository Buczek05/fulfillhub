const { toOrderSummaryResponse } = require("../orders/orders.mapper");

function createDashboardController(dashboardService) {
  async function getSummary(req, res) {
    const { ordersByStatus, lowStockProducts, recentOrders } = await dashboardService.summary(req.user);

    res.json({
      ordersByStatus,
      lowStockProducts,
      recentOrders: recentOrders.map(toOrderSummaryResponse),
    });
  }

  return { getSummary };
}

module.exports = { createDashboardController };
