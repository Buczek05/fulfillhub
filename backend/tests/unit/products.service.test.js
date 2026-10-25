import { describe, it, expect } from "vitest";

import { createProductsService } from "../../src/modules/products/products.service.js";
import { createFakeShopsRepository, createFakeProductsRepository } from "../helpers/fakes.js";

function setup(products = [{ id: 1, shopId: 1, sku: "ALF-001", name: "Kubek" }]) {
  const shopsRepository = createFakeShopsRepository([{ id: 1, name: "Sklep Alfa" }]);
  const productsRepository = createFakeProductsRepository(products);
  const service = createProductsService({ productsRepository, shopsRepository });

  return { service, productsRepository };
}

describe("products service", () => {
  it("rejects a SKU that already exists in the same shop", async () => {
    const { service } = setup();

    await expect(
      service.create({ shopId: 1, sku: "ALF-001", name: "Kubek inny" }),
    ).rejects.toMatchObject({ statusCode: 409, code: "SKU_ALREADY_EXISTS" });
  });

  it("rejects a product for an unknown shop", async () => {
    const { service } = setup();

    await expect(service.create({ shopId: 99, sku: "X-1", name: "Cokolwiek" })).rejects.toMatchObject({
      statusCode: 404,
      code: "SHOP_NOT_FOUND",
    });
  });

  // Reguła 7: historia magazynu musi zostać kompletna.
  it("refuses to delete a product that has history", async () => {
    const { service, productsRepository } = setup();
    productsRepository.markAsUsed(1);

    await expect(service.remove(1)).rejects.toMatchObject({
      statusCode: 409,
      code: "PRODUCT_IN_USE",
    });
    expect(productsRepository.rows).toHaveLength(1);
  });

  it("deletes a product without history", async () => {
    const { service, productsRepository } = setup();

    await service.remove(1);

    expect(productsRepository.rows).toHaveLength(0);
  });
});
