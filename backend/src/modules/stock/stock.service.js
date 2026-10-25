const { NotFoundError, ConflictError } = require("../../errors/AppError");
const { assertOwnedByActor } = require("../../schemas/scope");

function createStockService({ db, productsRepository, stockRepository, now = () => new Date() }) {
  // Każda zmiana stanu: blokada wiersza produktu, zapis stanu i wpis w historii – w jednej transakcji.
  async function lockProduct(id, trx) {
    const [product] = await productsRepository.findByIdsForUpdate([id], trx);
    if (!product) throw new NotFoundError("Product", "PRODUCT_NOT_FOUND");

    return product;
  }

  async function receive(productId, { quantity, reason }, actor = null) {
    return db.transaction(async (trx) => {
      const product = await lockProduct(productId, trx);

      const updated = await productsRepository.updateQuantities(
        product.id,
        { quantityOnHand: product.quantityOnHand + quantity },
        trx,
      );

      await stockRepository.insertMovement(
        {
          productId: product.id,
          type: "RECEIPT",
          quantity,
          reason,
          userId: actor?.id ?? null,
          createdAt: now(),
        },
        trx,
      );

      return updated;
    });
  }

  // Reguła 6: korekta nie może zejść poniżej tego, co jest już zarezerwowane pod zamówienia.
  async function adjust(productId, { newQuantityOnHand, reason }, actor = null) {
    return db.transaction(async (trx) => {
      const product = await lockProduct(productId, trx);

      if (newQuantityOnHand < product.quantityReserved) {
        throw new ConflictError(
          "New quantity on hand is below the quantity already reserved for orders",
          "STOCK_BELOW_RESERVED",
          {
            sku: product.sku,
            requested: newQuantityOnHand,
            quantityReserved: product.quantityReserved,
          },
        );
      }

      const delta = newQuantityOnHand - product.quantityOnHand;

      const updated = await productsRepository.updateQuantities(
        product.id,
        { quantityOnHand: newQuantityOnHand },
        trx,
      );

      await stockRepository.insertMovement(
        {
          productId: product.id,
          type: "ADJUSTMENT",
          quantity: delta,
          reason,
          userId: actor?.id ?? null,
          createdAt: now(),
        },
        trx,
      );

      return updated;
    });
  }

  async function listMovements(productId, { page, pageSize }, actor = null) {
    const product = await productsRepository.findById(productId);
    if (!product) throw new NotFoundError("Product", "PRODUCT_NOT_FOUND");

    assertOwnedByActor(actor, product.shopId, "Product");

    return stockRepository.listByProduct(productId, { page, pageSize });
  }

  return { receive, adjust, listMovements };
}

module.exports = { createStockService };
