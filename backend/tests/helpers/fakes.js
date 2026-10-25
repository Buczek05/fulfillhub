// Fake repositories trzymane w pamięci – testy reguł biznesowych nie dotykają Postgresa.
// Sygnatury są takie same jak w prawdziwych repositories, łącznie z nieużywanym tu parametrem trx.

export function createFakeDb() {
  return { transaction: async (callback) => callback({}) };
}

export function createFakeShopsRepository(shops = []) {
  const rows = shops.map((shop) => ({ ...shop }));

  return {
    rows,
    findById: async (id) => rows.find((shop) => shop.id === id),
  };
}

export function createFakeProductsRepository(products = []) {
  const rows = products.map((product) => ({
    quantityOnHand: 0,
    quantityReserved: 0,
    lowStockThreshold: 0,
    version: 1,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    ...product,
  }));

  const history = new Set();

  return {
    rows,
    markAsUsed: (id) => history.add(id),
    findById: async (id) => rows.find((product) => product.id === id),
    findBySku: async (shopId, sku) => rows.find((p) => p.shopId === shopId && p.sku === sku),
    // Kopie, tak jak prawdziwe repository zwracające świeże wiersze z bazy –
    // inaczej „stan przed” i „stan po” byłyby tym samym obiektem.
    findByIdsForUpdate: async (ids) =>
      rows
        .filter((product) => ids.includes(product.id))
        .sort((a, b) => a.id - b.id)
        .map((product) => ({ ...product })),
    create: async (input) => {
      const created = { id: rows.length + 1, quantityOnHand: 0, quantityReserved: 0, ...input };
      rows.push(created);
      return created;
    },
    update: async (id, patch) => {
      const product = rows.find((row) => row.id === id);
      Object.assign(product, patch);
      return product;
    },
    updateQuantities: async (id, patch) => {
      const product = rows.find((row) => row.id === id);
      if (patch.quantityOnHand !== undefined) product.quantityOnHand = patch.quantityOnHand;
      if (patch.quantityReserved !== undefined) product.quantityReserved = patch.quantityReserved;
      product.version += 1;
      return { ...product };
    },
    remove: async (id) => {
      const index = rows.findIndex((row) => row.id === id);
      rows.splice(index, 1);
      return 1;
    },
    countByShop: async (shopId) => rows.filter((product) => product.shopId === shopId).length,
    hasHistory: async (id) => history.has(id),
  };
}

export function createFakeStockRepository() {
  const movements = [];

  return {
    movements,
    insertMovement: async (movement) => {
      const created = { id: movements.length + 1, ...movement };
      movements.push(created);
      return created;
    },
    insertMovements: async (batch) => {
      const created = batch.map((movement) => ({ id: movements.length + 1, ...movement }));
      movements.push(...created);
      return created;
    },
    listByProduct: async (productId) => ({
      data: movements.filter((movement) => movement.productId === productId),
      total: movements.filter((movement) => movement.productId === productId).length,
    }),
  };
}

export function createFakeOrdersRepository({ orders = [], items = [] } = {}) {
  const orderRows = orders.map((order) => ({ ...order }));
  const itemRows = items.map((item) => ({ ...item }));
  const shipments = [];

  const find = (id) => orderRows.find((order) => order.id === id);

  return {
    orders: orderRows,
    items: itemRows,
    shipments,
    findById: async (id) => find(id),
    findByIdForUpdate: async (id) => find(id),
    findByShopAndExternalRef: async (shopId, externalRef) =>
      orderRows.find((order) => order.shopId === shopId && order.externalRef === externalRef),
    findItems: async (orderId) => itemRows.filter((item) => item.orderId === orderId),
    findShipment: async (orderId) => shipments.find((shipment) => shipment.orderId === orderId),
    findDetailsById: async (id) => {
      const order = find(id);
      if (!order) return undefined;
      return {
        ...order,
        items: itemRows.filter((item) => item.orderId === id),
        shipment: shipments.find((shipment) => shipment.orderId === id) ?? null,
      };
    },
    create: async (input) => {
      const created = { id: orderRows.length + 1, status: "NEW", cancelledAt: null, ...input };
      orderRows.push(created);
      return created;
    },
    insertItems: async (orderId, newItems) => {
      for (const item of newItems) {
        itemRows.push({ id: itemRows.length + 1, orderId, ...item });
      }
    },
    updateStatus: async (id, patch) => {
      const order = find(id);
      order.status = patch.status;
      if (patch.cancelledAt !== undefined) order.cancelledAt = patch.cancelledAt;
      return order;
    },
    createShipment: async (shipment) => {
      const created = { id: shipments.length + 1, ...shipment };
      shipments.push(created);
      return created;
    },
    countByShop: async (shopId) => orderRows.filter((order) => order.shopId === shopId).length,
  };
}
