const COLUMNS = [
  "id",
  "product_id as productId",
  "type",
  "quantity",
  "reason",
  "order_id as orderId",
  "user_id as userId",
  "created_at as createdAt",
];

function createStockRepository({ db }) {
  const table = (trx = db) => trx("stock_movements");

  function toRow({ productId, type, quantity, reason, orderId, userId, createdAt }) {
    return {
      product_id: productId,
      type,
      quantity,
      reason: reason ?? null,
      order_id: orderId ?? null,
      user_id: userId ?? null,
      ...(createdAt ? { created_at: createdAt } : {}),
    };
  }

  async function insertMovement(movement, trx) {
    const [created] = await table(trx).insert(toRow(movement)).returning(COLUMNS);

    return created;
  }

  async function insertMovements(movements, trx) {
    if (movements.length === 0) return [];

    return table(trx).insert(movements.map(toRow)).returning(COLUMNS);
  }

  async function listByProduct(productId, { page, pageSize }) {
    const base = table().where({ product_id: productId });

    const [{ count }] = await base.clone().count({ count: "*" });
    const data = await base
      .clone()
      .select(COLUMNS)
      .orderBy("id", "desc")
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { data, total: Number(count) };
  }

  return { insertMovement, insertMovements, listByProduct };
}

module.exports = { createStockRepository };
