const { scopeShopId } = require("../../schemas/scope");

const RECENT_ORDERS_LIMIT = 5;

function createDashboardService({ dashboardRepository }) {
  async function summary(actor = null) {
    const shopId = scopeShopId(actor, undefined);

    const [ordersByStatus, lowStockProducts, recentOrders] = await Promise.all([
      dashboardRepository.countOrdersByStatus(shopId),
      dashboardRepository.countLowStockProducts(shopId),
      dashboardRepository.findRecentOrders(shopId, RECENT_ORDERS_LIMIT),
    ]);

    return { ordersByStatus, lowStockProducts, recentOrders };
  }

  return { summary };
}

module.exports = { createDashboardService };
