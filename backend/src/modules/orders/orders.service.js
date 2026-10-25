const { NotFoundError, ValidationError, ConflictError } = require("../../errors/AppError");

// Reguła 3: cykl życia zamówienia trzymany jako dane, nie jako ciąg ifów.
const STATUS_TRANSITIONS = {
  NEW: ["PICKING", "CANCELLED"],
  PICKING: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: [],
  CANCELLED: [],
};

/**
 * Znak w stock_movements:
 *   RECEIPT +q, ADJUSTMENT ±delta, SHIPMENT -q  → sumują się do quantity_on_hand
 *   RESERVATION +q, RELEASE -q, SHIPMENT -q     → sumują się do quantity_reserved
 */
function createOrdersService({
  db,
  ordersRepository,
  productsRepository,
  shopsRepository,
  stockRepository,
  now = () => new Date(),
}) {
  function assertTransitionAllowed(from, to) {
    if (!STATUS_TRANSITIONS[from].includes(to)) {
      throw new ConflictError(
        `Cannot change order status from ${from} to ${to}`,
        "INVALID_STATUS_TRANSITION",
        { from, to, allowed: STATUS_TRANSITIONS[from] },
      );
    }
  }

  async function list({ page, pageSize, status, shopId, q }) {
    return ordersRepository.list({ page, pageSize, status, shopId, q });
  }

  async function getById(id) {
    const order = await ordersRepository.findDetailsById(id);
    if (!order) throw new NotFoundError("Order", "ORDER_NOT_FOUND");

    return order;
  }

  // Reguła 1 i 2: rezerwacja stanu przy zamówieniu, pozycje tylko z produktów tego sklepu.
  async function create(input, actor = null) {
    const productIds = input.items.map((item) => item.productId);
    const duplicates = productIds.filter((id, index) => productIds.indexOf(id) !== index);

    if (duplicates.length > 0) {
      throw new ValidationError(
        [{ location: "body", field: "items", message: "Each product may appear only once" }],
        "Order contains duplicated products",
        "DUPLICATE_ORDER_ITEM",
      );
    }

    return db.transaction(async (trx) => {
      const shop = await shopsRepository.findById(input.shopId, trx);
      if (!shop) throw new NotFoundError("Shop", "SHOP_NOT_FOUND");

      const existing = await ordersRepository.findByShopAndExternalRef(
        input.shopId,
        input.externalRef,
        trx,
      );
      if (existing) {
        throw new ConflictError(
          `Order ${input.externalRef} already exists in this shop`,
          "ORDER_REF_ALREADY_EXISTS",
        );
      }

      const products = await productsRepository.findByIdsForUpdate(productIds, trx);
      const byId = new Map(products.map((product) => [product.id, product]));

      const missing = productIds.filter((id) => !byId.has(id));
      if (missing.length > 0) {
        throw new NotFoundError("Product", "PRODUCT_NOT_FOUND");
      }

      const foreign = products.filter((product) => product.shopId !== input.shopId);
      if (foreign.length > 0) {
        throw new ValidationError(
          foreign.map((product) => ({
            location: "body",
            field: "items",
            message: `Product ${product.sku} belongs to another shop`,
          })),
          "Order contains products from another shop",
          "PRODUCT_NOT_IN_SHOP",
        );
      }

      const insufficient = input.items
        .map((item) => ({ item, product: byId.get(item.productId) }))
        .filter(({ item, product }) => product.quantityOnHand - product.quantityReserved < item.quantity)
        .map(({ item, product }) => ({
          sku: product.sku,
          requested: item.quantity,
          available: product.quantityOnHand - product.quantityReserved,
        }));

      if (insufficient.length > 0) {
        throw new ConflictError(
          "Not enough stock available for the requested items",
          "INSUFFICIENT_STOCK",
          insufficient,
        );
      }

      const createdAt = now();
      const order = await ordersRepository.create({ ...input, createdAt }, trx);
      await ordersRepository.insertItems(order.id, input.items, trx);

      for (const item of input.items) {
        const product = byId.get(item.productId);

        await productsRepository.updateQuantities(
          product.id,
          { quantityReserved: product.quantityReserved + item.quantity },
          trx,
        );
      }

      await stockRepository.insertMovements(
        input.items.map((item) => ({
          productId: item.productId,
          type: "RESERVATION",
          quantity: item.quantity,
          orderId: order.id,
          userId: actor?.id ?? null,
          createdAt,
        })),
        trx,
      );

      return ordersRepository.findDetailsById(order.id, trx);
    });
  }

  // Reguła 3: ponowne ustawienie tego samego statusu nic nie zmienia i nie jest błędem.
  async function changeStatus(id, status) {
    return db.transaction(async (trx) => {
      const order = await ordersRepository.findByIdForUpdate(id, trx);
      if (!order) throw new NotFoundError("Order", "ORDER_NOT_FOUND");

      if (order.status !== status) {
        assertTransitionAllowed(order.status, status);
        await ordersRepository.updateStatus(id, { status }, trx);
      }

      return ordersRepository.findDetailsById(id, trx);
    });
  }

  // Reguła 4: wysyłka zdejmuje stan i zwalnia rezerwację, wszystko w jednej transakcji.
  async function ship(id, { carrier, trackingNumber }, actor = null) {
    return db.transaction(async (trx) => {
      const order = await ordersRepository.findByIdForUpdate(id, trx);
      if (!order) throw new NotFoundError("Order", "ORDER_NOT_FOUND");

      if (order.status === "SHIPPED") return ordersRepository.findDetailsById(id, trx);

      assertTransitionAllowed(order.status, "SHIPPED");

      const items = await ordersRepository.findItems(id, trx);
      const products = await productsRepository.findByIdsForUpdate(
        items.map((item) => item.productId),
        trx,
      );
      const byId = new Map(products.map((product) => [product.id, product]));

      const shippedAt = now();

      for (const item of items) {
        const product = byId.get(item.productId);

        await productsRepository.updateQuantities(
          product.id,
          {
            quantityOnHand: product.quantityOnHand - item.quantity,
            quantityReserved: product.quantityReserved - item.quantity,
          },
          trx,
        );
      }

      await stockRepository.insertMovements(
        items.map((item) => ({
          productId: item.productId,
          type: "SHIPMENT",
          quantity: -item.quantity,
          orderId: id,
          userId: actor?.id ?? null,
          createdAt: shippedAt,
        })),
        trx,
      );

      await ordersRepository.createShipment({ orderId: id, carrier, trackingNumber, shippedAt }, trx);
      await ordersRepository.updateStatus(id, { status: "SHIPPED" }, trx);

      return ordersRepository.findDetailsById(id, trx);
    });
  }

  // Reguła 5: anulowanie zwalnia rezerwację. Sklep może anulować tylko zanim magazyn ruszy z kompletacją.
  async function cancel(id, actor = null) {
    return db.transaction(async (trx) => {
      const order = await ordersRepository.findByIdForUpdate(id, trx);
      if (!order) throw new NotFoundError("Order", "ORDER_NOT_FOUND");

      if (order.status === "CANCELLED") return ordersRepository.findDetailsById(id, trx);

      if (order.status === "SHIPPED") {
        throw new ConflictError("Shipped order cannot be cancelled", "ORDER_ALREADY_SHIPPED");
      }

      if (actor?.role === "SHOP" && order.status !== "NEW") {
        throw new ConflictError(
          "Order is already being processed by the warehouse",
          "ORDER_ALREADY_IN_PROGRESS",
          { status: order.status },
        );
      }

      assertTransitionAllowed(order.status, "CANCELLED");

      const items = await ordersRepository.findItems(id, trx);
      const products = await productsRepository.findByIdsForUpdate(
        items.map((item) => item.productId),
        trx,
      );
      const byId = new Map(products.map((product) => [product.id, product]));

      const cancelledAt = now();

      for (const item of items) {
        const product = byId.get(item.productId);

        await productsRepository.updateQuantities(
          product.id,
          { quantityReserved: product.quantityReserved - item.quantity },
          trx,
        );
      }

      await stockRepository.insertMovements(
        items.map((item) => ({
          productId: item.productId,
          type: "RELEASE",
          quantity: -item.quantity,
          orderId: id,
          userId: actor?.id ?? null,
          createdAt: cancelledAt,
        })),
        trx,
      );

      await ordersRepository.updateStatus(id, { status: "CANCELLED", cancelledAt }, trx);

      return ordersRepository.findDetailsById(id, trx);
    });
  }

  return { list, getById, create, changeStatus, ship, cancel };
}

module.exports = { createOrdersService, STATUS_TRANSITIONS };
