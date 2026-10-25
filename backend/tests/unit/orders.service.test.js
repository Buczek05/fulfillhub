import { describe, it, expect, beforeEach } from "vitest";

import { createOrdersService } from "../../src/modules/orders/orders.service.js";
import {
  createFakeDb,
  createFakeShopsRepository,
  createFakeProductsRepository,
  createFakeStockRepository,
  createFakeOrdersRepository,
} from "../helpers/fakes.js";

const NOW = new Date("2026-10-25T10:00:00.000Z");
const now = () => NOW;

function setup({ products, orders = [], items = [] } = {}) {
  const shopsRepository = createFakeShopsRepository([
    { id: 1, name: "Sklep Alfa" },
    { id: 2, name: "Sklep Beta" },
  ]);
  const productsRepository = createFakeProductsRepository(
    products ?? [
      { id: 1, shopId: 1, sku: "ALF-001", quantityOnHand: 10, quantityReserved: 0 },
      { id: 2, shopId: 1, sku: "ALF-002", quantityOnHand: 3, quantityReserved: 0 },
      { id: 3, shopId: 2, sku: "BET-001", quantityOnHand: 5, quantityReserved: 0 },
    ],
  );
  const stockRepository = createFakeStockRepository();
  const ordersRepository = createFakeOrdersRepository({ orders, items });

  const service = createOrdersService({
    db: createFakeDb(),
    ordersRepository,
    productsRepository,
    shopsRepository,
    stockRepository,
    now,
  });

  return { service, productsRepository, stockRepository, ordersRepository };
}

const orderInput = (overrides = {}) => ({
  shopId: 1,
  externalRef: "ALF-ZAM-1",
  recipientName: "Jan Kowalski",
  recipientAddress: "ul. Testowa 1",
  items: [{ productId: 1, quantity: 4 }],
  ...overrides,
});

describe("orders service – reguła 1: rezerwacja stanu", () => {
  let context;

  beforeEach(() => {
    context = setup();
  });

  it("reserves stock and records a RESERVATION movement", async () => {
    const order = await context.service.create(orderInput());

    expect(order.status).toBe("NEW");
    expect(context.productsRepository.rows[0].quantityReserved).toBe(4);
    expect(context.productsRepository.rows[0].quantityOnHand).toBe(10); // rezerwacja nie zdejmuje towaru
    expect(context.stockRepository.movements).toHaveLength(1);
    expect(context.stockRepository.movements[0]).toMatchObject({
      productId: 1,
      type: "RESERVATION",
      quantity: 4,
      createdAt: NOW,
    });
  });

  it("rejects the whole order when any item exceeds available stock", async () => {
    const input = orderInput({
      items: [
        { productId: 1, quantity: 4 },
        { productId: 2, quantity: 99 },
      ],
    });

    await expect(context.service.create(input)).rejects.toMatchObject({
      statusCode: 409,
      code: "INSUFFICIENT_STOCK",
      details: [{ sku: "ALF-002", requested: 99, available: 3 }],
    });

    // Żaden produkt nie został zarezerwowany – zamówienie odrzucamy w całości.
    expect(context.productsRepository.rows[0].quantityReserved).toBe(0);
    expect(context.stockRepository.movements).toHaveLength(0);
  });

  it("counts already reserved stock as unavailable", async () => {
    const { service } = setup({
      products: [{ id: 1, shopId: 1, sku: "ALF-001", quantityOnHand: 10, quantityReserved: 8 }],
    });

    await expect(service.create(orderInput({ items: [{ productId: 1, quantity: 3 }] }))).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
      details: [{ sku: "ALF-001", requested: 3, available: 2 }],
    });
  });
});

describe("orders service – reguła 2: pozycje należą do sklepu zamówienia", () => {
  it("rejects a product owned by another shop", async () => {
    const { service } = setup();

    await expect(
      service.create(orderInput({ items: [{ productId: 3, quantity: 1 }] })),
    ).rejects.toMatchObject({ statusCode: 400, code: "PRODUCT_NOT_IN_SHOP" });
  });

  it("rejects the same product listed twice", async () => {
    const { service } = setup();

    await expect(
      service.create(
        orderInput({
          items: [
            { productId: 1, quantity: 1 },
            { productId: 1, quantity: 2 },
          ],
        }),
      ),
    ).rejects.toMatchObject({ statusCode: 400, code: "DUPLICATE_ORDER_ITEM" });
  });

  it("rejects a duplicated external reference within the same shop", async () => {
    const { service } = setup({
      orders: [{ id: 1, shopId: 1, externalRef: "ALF-ZAM-1", status: "NEW" }],
    });

    await expect(service.create(orderInput())).rejects.toMatchObject({
      statusCode: 409,
      code: "ORDER_REF_ALREADY_EXISTS",
    });
  });
});

describe("orders service – reguła 3: state machine", () => {
  const orderInStatus = (status) =>
    setup({
      orders: [{ id: 1, shopId: 1, externalRef: "ALF-ZAM-1", status, cancelledAt: null }],
      items: [{ id: 1, orderId: 1, productId: 1, quantity: 4 }],
    });

  it.each([
    ["NEW", "PICKING"],
    ["PICKING", "PACKED"],
  ])("allows %s -> %s", async (from, to) => {
    const { service } = orderInStatus(from);

    const order = await service.changeStatus(1, to);

    expect(order.status).toBe(to);
  });

  it.each([
    ["NEW", "PACKED"],
    ["PACKED", "PICKING"],
    ["SHIPPED", "PICKING"],
    ["CANCELLED", "PICKING"],
  ])("rejects %s -> %s", async (from, to) => {
    const { service } = orderInStatus(from);

    await expect(service.changeStatus(1, to)).rejects.toMatchObject({
      statusCode: 409,
      code: "INVALID_STATUS_TRANSITION",
      details: { from, to },
    });
  });

  it("is idempotent when the status does not change", async () => {
    const { service, ordersRepository } = orderInStatus("PICKING");

    const order = await service.changeStatus(1, "PICKING");

    expect(order.status).toBe("PICKING");
    expect(ordersRepository.orders[0].status).toBe("PICKING");
  });

  it("returns 404 for an unknown order", async () => {
    const { service } = setup();

    await expect(service.changeStatus(99, "PICKING")).rejects.toMatchObject({
      statusCode: 404,
      code: "ORDER_NOT_FOUND",
    });
  });
});

describe("orders service – reguła 4: wysyłka zdejmuje stan", () => {
  const packedOrder = () =>
    setup({
      products: [{ id: 1, shopId: 1, sku: "ALF-001", quantityOnHand: 10, quantityReserved: 4 }],
      orders: [{ id: 1, shopId: 1, externalRef: "ALF-ZAM-1", status: "PACKED", cancelledAt: null }],
      items: [{ id: 1, orderId: 1, productId: 1, quantity: 4 }],
    });

  it("removes stock, clears the reservation and creates a shipment", async () => {
    const { service, productsRepository, stockRepository, ordersRepository } = packedOrder();

    const order = await service.ship(1, { carrier: "InPost", trackingNumber: "PL1" });

    expect(order.status).toBe("SHIPPED");
    expect(productsRepository.rows[0].quantityOnHand).toBe(6);
    expect(productsRepository.rows[0].quantityReserved).toBe(0);
    expect(stockRepository.movements[0]).toMatchObject({ type: "SHIPMENT", quantity: -4, orderId: 1 });
    expect(ordersRepository.shipments[0]).toMatchObject({
      carrier: "InPost",
      trackingNumber: "PL1",
      shippedAt: NOW,
    });
  });

  it("refuses to ship an order that is not packed", async () => {
    const { service } = setup({
      orders: [{ id: 1, shopId: 1, externalRef: "ALF-ZAM-1", status: "NEW", cancelledAt: null }],
      items: [{ id: 1, orderId: 1, productId: 1, quantity: 4 }],
    });

    await expect(service.ship(1, { carrier: "InPost", trackingNumber: "PL1" })).rejects.toMatchObject({
      statusCode: 409,
      code: "INVALID_STATUS_TRANSITION",
    });
  });

  it("does not ship twice", async () => {
    const { service, productsRepository } = packedOrder();

    await service.ship(1, { carrier: "InPost", trackingNumber: "PL1" });
    await service.ship(1, { carrier: "InPost", trackingNumber: "PL1" });

    expect(productsRepository.rows[0].quantityOnHand).toBe(6); // stan zdjęty tylko raz
  });
});

describe("orders service – reguła 5: anulowanie zwalnia rezerwację", () => {
  const orderInStatus = (status) =>
    setup({
      products: [{ id: 1, shopId: 1, sku: "ALF-001", quantityOnHand: 10, quantityReserved: 4 }],
      orders: [{ id: 1, shopId: 1, externalRef: "ALF-ZAM-1", status, cancelledAt: null }],
      items: [{ id: 1, orderId: 1, productId: 1, quantity: 4 }],
    });

  it("releases the reservation and records a RELEASE movement", async () => {
    const { service, productsRepository, stockRepository } = orderInStatus("NEW");

    const order = await service.cancel(1);

    expect(order.status).toBe("CANCELLED");
    expect(order.cancelledAt).toEqual(NOW);
    expect(productsRepository.rows[0].quantityReserved).toBe(0);
    expect(productsRepository.rows[0].quantityOnHand).toBe(10); // towar fizycznie zostaje
    expect(stockRepository.movements[0]).toMatchObject({ type: "RELEASE", quantity: -4, orderId: 1 });
  });

  it("lets the warehouse cancel an order already in picking", async () => {
    const { service } = orderInStatus("PICKING");

    const order = await service.cancel(1, { id: 7, role: "WAREHOUSE" });

    expect(order.status).toBe("CANCELLED");
  });

  it("stops a SHOP from cancelling once the warehouse started picking", async () => {
    const { service, productsRepository } = orderInStatus("PICKING");

    await expect(service.cancel(1, { id: 9, role: "SHOP", shopId: 1 })).rejects.toMatchObject({
      statusCode: 409,
      code: "ORDER_ALREADY_IN_PROGRESS",
    });
    expect(productsRepository.rows[0].quantityReserved).toBe(4);
  });

  it("refuses to cancel a shipped order", async () => {
    const { service } = orderInStatus("SHIPPED");

    await expect(service.cancel(1)).rejects.toMatchObject({
      statusCode: 409,
      code: "ORDER_ALREADY_SHIPPED",
    });
  });

  it("is idempotent for an already cancelled order", async () => {
    const { service, stockRepository } = orderInStatus("CANCELLED");

    const order = await service.cancel(1);

    expect(order.status).toBe("CANCELLED");
    expect(stockRepository.movements).toHaveLength(0); // rezerwacji nie zwalniamy drugi raz
  });
});
