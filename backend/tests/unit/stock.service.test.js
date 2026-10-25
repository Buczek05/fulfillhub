import { describe, it, expect } from "vitest";

import { createStockService } from "../../src/modules/stock/stock.service.js";
import { createFakeDb, createFakeProductsRepository, createFakeStockRepository } from "../helpers/fakes.js";

const NOW = new Date("2026-10-25T10:00:00.000Z");

function setup(products = [{ id: 1, shopId: 1, sku: "ALF-001", quantityOnHand: 10, quantityReserved: 4 }]) {
  const productsRepository = createFakeProductsRepository(products);
  const stockRepository = createFakeStockRepository();

  const service = createStockService({
    db: createFakeDb(),
    productsRepository,
    stockRepository,
    now: () => NOW,
  });

  return { service, productsRepository, stockRepository };
}

describe("stock service – przyjęcie dostawy", () => {
  it("increases quantity on hand and records a RECEIPT movement", async () => {
    const { service, productsRepository, stockRepository } = setup();

    const product = await service.receive(1, { quantity: 5, reason: "dostawa 001" }, { id: 7 });

    expect(product.quantityOnHand).toBe(15);
    expect(productsRepository.rows[0].quantityReserved).toBe(4); // rezerwacji nie ruszamy
    expect(stockRepository.movements[0]).toMatchObject({
      type: "RECEIPT",
      quantity: 5,
      reason: "dostawa 001",
      userId: 7,
      createdAt: NOW,
    });
  });

  it("returns 404 for an unknown product", async () => {
    const { service } = setup();

    await expect(service.receive(99, { quantity: 5 })).rejects.toMatchObject({
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
    });
  });
});

describe("stock service – reguła 6: korekta nie schodzi poniżej rezerwacji", () => {
  it("rejects a correction below the reserved quantity", async () => {
    const { service, productsRepository, stockRepository } = setup();

    await expect(
      service.adjust(1, { newQuantityOnHand: 2, reason: "inwentaryzacja" }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "STOCK_BELOW_RESERVED",
      details: { sku: "ALF-001", requested: 2, quantityReserved: 4 },
    });

    expect(productsRepository.rows[0].quantityOnHand).toBe(10);
    expect(stockRepository.movements).toHaveLength(0);
  });

  it("allows a correction down to exactly the reserved quantity", async () => {
    const { service, stockRepository } = setup();

    const product = await service.adjust(1, { newQuantityOnHand: 4, reason: "inwentaryzacja" });

    expect(product.quantityOnHand).toBe(4);
    expect(stockRepository.movements[0]).toMatchObject({
      type: "ADJUSTMENT",
      quantity: -6, // ruch zapisujemy jako różnicę, nie jako nowy stan
      reason: "inwentaryzacja",
    });
  });

  it("records a positive delta when the correction raises the stock", async () => {
    const { service, stockRepository } = setup();

    await service.adjust(1, { newQuantityOnHand: 12, reason: "znalezione w magazynie" });

    expect(stockRepository.movements[0]).toMatchObject({ type: "ADJUSTMENT", quantity: 2 });
  });
});
