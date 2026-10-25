const COLUMNS = [
  "id",
  "shop_id as shopId",
  "sku",
  "name",
  "ean",
  "quantity_on_hand as quantityOnHand",
  "quantity_reserved as quantityReserved",
  "low_stock_threshold as lowStockThreshold",
  "version",
  "created_at as createdAt",
  "updated_at as updatedAt",
];

const SORT_COLUMNS = {
  id: "id",
  sku: "sku",
  name: "name",
  quantityOnHand: "quantity_on_hand",
  createdAt: "created_at",
};

function createProductsRepository({ db }) {
  const table = (trx = db) => trx("products");

  async function list({ page, pageSize, q, shopId, lowStock, sort }) {
    const base = table().modify((query) => {
      if (shopId) query.where({ shop_id: shopId });
      if (q) {
        query.where((builder) => builder.whereILike("sku", `%${q}%`).orWhereILike("name", `%${q}%`));
      }
      if (lowStock) query.whereRaw("quantity_on_hand - quantity_reserved < low_stock_threshold");
    });

    const [{ count }] = await base.clone().count({ count: "*" });

    const descending = Boolean(sort) && sort.startsWith("-");
    const sortColumn = SORT_COLUMNS[sort?.replace(/^-/, "")] ?? "id";

    const data = await base
      .clone()
      .select(COLUMNS)
      .orderBy(sortColumn, descending ? "desc" : "asc")
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { data, total: Number(count) };
  }

  async function findById(id, trx) {
    return table(trx).select(COLUMNS).where({ id }).first();
  }

  async function findBySku(shopId, sku, trx) {
    return table(trx).select(COLUMNS).where({ shop_id: shopId, sku }).first();
  }

  // Blokada wierszy pod rezerwację/wysyłkę. Stała kolejność po id chroni przed zakleszczeniem,
  // gdy dwa zamówienia dotyczą tych samych produktów w innej kolejności.
  async function findByIdsForUpdate(ids, trx) {
    return table(trx).select(COLUMNS).whereIn("id", ids).orderBy("id", "asc").forUpdate();
  }

  async function create({ shopId, sku, name, ean, lowStockThreshold }, trx) {
    const [created] = await table(trx)
      .insert({
        shop_id: shopId,
        sku,
        name,
        ean: ean ?? null,
        low_stock_threshold: lowStockThreshold ?? 0,
      })
      .returning(COLUMNS);

    return created;
  }

  async function update(id, { name, ean, lowStockThreshold }, trx) {
    const patch = { updated_at: new Date() };
    if (name !== undefined) patch.name = name;
    if (ean !== undefined) patch.ean = ean;
    if (lowStockThreshold !== undefined) patch.low_stock_threshold = lowStockThreshold;

    const [updated] = await table(trx).where({ id }).update(patch).returning(COLUMNS);

    return updated;
  }

  async function updateQuantities(id, { quantityOnHand, quantityReserved }, trx) {
    const patch = { updated_at: new Date(), version: db.raw("version + 1") };
    if (quantityOnHand !== undefined) patch.quantity_on_hand = quantityOnHand;
    if (quantityReserved !== undefined) patch.quantity_reserved = quantityReserved;

    const [updated] = await table(trx).where({ id }).update(patch).returning(COLUMNS);

    return updated;
  }

  async function remove(id, trx) {
    return table(trx).where({ id }).del();
  }

  async function countByShop(shopId, trx) {
    const [{ count }] = await table(trx).where({ shop_id: shopId }).count({ count: "*" });

    return Number(count);
  }

  async function hasHistory(id, trx = db) {
    const [movement, orderItem] = await Promise.all([
      trx("stock_movements").where({ product_id: id }).first("id"),
      trx("order_items").where({ product_id: id }).first("id"),
    ]);

    return Boolean(movement || orderItem);
  }

  return {
    list,
    findById,
    findBySku,
    findByIdsForUpdate,
    create,
    update,
    updateQuantities,
    remove,
    countByShop,
    hasHistory,
  };
}

module.exports = { createProductsRepository };
