const COLUMNS = [
  "id",
  "shop_id as shopId",
  "external_ref as externalRef",
  "status",
  "recipient_name as recipientName",
  "recipient_address as recipientAddress",
  "recipient_email as recipientEmail",
  "created_at as createdAt",
  "cancelled_at as cancelledAt",
];

const ITEM_COLUMNS = [
  "order_items.id",
  "order_items.order_id as orderId",
  "order_items.product_id as productId",
  "order_items.quantity",
  "products.sku",
  "products.name",
];

const SHIPMENT_COLUMNS = [
  "id",
  "order_id as orderId",
  "carrier",
  "tracking_number as trackingNumber",
  "shipped_at as shippedAt",
];

function createOrdersRepository({ db }) {
  const table = (trx = db) => trx("orders");

  async function list({ page, pageSize, status, shopId, q }) {
    const base = table().modify((query) => {
      if (status) query.where({ status });
      if (shopId) query.where({ shop_id: shopId });
      if (q) {
        query.where((builder) =>
          builder.whereILike("external_ref", `%${q}%`).orWhereILike("recipient_name", `%${q}%`),
        );
      }
    });

    const [{ count }] = await base.clone().count({ count: "*" });

    const data = await base
      .clone()
      .select([
        ...COLUMNS,
        db.raw("(select count(*) from order_items where order_items.order_id = orders.id) as \"itemCount\""),
      ])
      .orderBy("id", "desc")
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return { data, total: Number(count) };
  }

  async function findById(id, trx) {
    return table(trx).select(COLUMNS).where({ id }).first();
  }

  // Blokada zamówienia na czas wysyłki/anulowania – dwa równoległe żądania nie zdejmą stanu dwa razy.
  async function findByIdForUpdate(id, trx) {
    return table(trx).select(COLUMNS).where({ id }).forUpdate().first();
  }

  async function findByShopAndExternalRef(shopId, externalRef, trx) {
    return table(trx).select(COLUMNS).where({ shop_id: shopId, external_ref: externalRef }).first();
  }

  async function findItems(orderId, trx = db) {
    return trx("order_items")
      .join("products", "products.id", "order_items.product_id")
      .select(ITEM_COLUMNS)
      .where({ order_id: orderId })
      .orderBy("order_items.id", "asc");
  }

  async function findShipment(orderId, trx = db) {
    return trx("shipments").select(SHIPMENT_COLUMNS).where({ order_id: orderId }).first();
  }

  async function findDetailsById(id, trx) {
    const order = await findById(id, trx);
    if (!order) return undefined;

    const [items, shipment] = await Promise.all([findItems(id, trx), findShipment(id, trx)]);

    return { ...order, items, shipment: shipment ?? null };
  }

  async function create(
    { shopId, externalRef, recipientName, recipientAddress, recipientEmail, createdAt },
    trx,
  ) {
    const [created] = await table(trx)
      .insert({
        shop_id: shopId,
        external_ref: externalRef,
        status: "NEW",
        recipient_name: recipientName,
        recipient_address: recipientAddress,
        recipient_email: recipientEmail ?? null,
        ...(createdAt ? { created_at: createdAt } : {}),
      })
      .returning(COLUMNS);

    return created;
  }

  async function insertItems(orderId, items, trx) {
    return trx("order_items").insert(
      items.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
      })),
    );
  }

  async function updateStatus(id, { status, cancelledAt }, trx) {
    const [updated] = await table(trx)
      .where({ id })
      .update({ status, ...(cancelledAt !== undefined ? { cancelled_at: cancelledAt } : {}) })
      .returning(COLUMNS);

    return updated;
  }

  async function createShipment({ orderId, carrier, trackingNumber, shippedAt }, trx) {
    const [created] = await trx("shipments")
      .insert({
        order_id: orderId,
        carrier,
        tracking_number: trackingNumber,
        ...(shippedAt ? { shipped_at: shippedAt } : {}),
      })
      .returning(SHIPMENT_COLUMNS);

    return created;
  }

  async function countByShop(shopId, trx) {
    const [{ count }] = await table(trx).where({ shop_id: shopId }).count({ count: "*" });

    return Number(count);
  }

  return {
    list,
    findById,
    findByIdForUpdate,
    findByShopAndExternalRef,
    findItems,
    findShipment,
    findDetailsById,
    create,
    insertItems,
    updateStatus,
    createShipment,
    countByShop,
  };
}

module.exports = { createOrdersRepository };
