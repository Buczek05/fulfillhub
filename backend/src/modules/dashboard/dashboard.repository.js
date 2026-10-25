const { ORDER_STATUSES } = require("../orders/orders.schemas");

function createDashboardRepository({ db }) {
  async function countOrdersByStatus(shopId) {
    const rows = await db("orders")
      .modify((query) => {
        if (shopId) query.where({ shop_id: shopId });
      })
      .select("status")
      .count({ count: "*" })
      .groupBy("status");

    // Statusy bez zamówień też muszą być w odpowiedzi, żeby UI nie musiał zgadywać zer.
    const counts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]));
    for (const row of rows) counts[row.status] = Number(row.count);

    return counts;
  }

  async function countLowStockProducts(shopId) {
    const [{ count }] = await db("products")
      .modify((query) => {
        if (shopId) query.where({ shop_id: shopId });
      })
      .whereRaw("quantity_on_hand - quantity_reserved < low_stock_threshold")
      .count({ count: "*" });

    return Number(count);
  }

  async function findRecentOrders(shopId, limit) {
    return db("orders")
      .modify((query) => {
        if (shopId) query.where({ shop_id: shopId });
      })
      .select([
        "id",
        "shop_id as shopId",
        "external_ref as externalRef",
        "status",
        "recipient_name as recipientName",
        "created_at as createdAt",
        "cancelled_at as cancelledAt",
        db.raw("(select count(*) from order_items where order_items.order_id = orders.id) as \"itemCount\""),
      ])
      .orderBy("id", "desc")
      .limit(limit);
  }

  return { countOrdersByStatus, countLowStockProducts, findRecentOrders };
}

module.exports = { createDashboardRepository };
