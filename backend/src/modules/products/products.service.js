const { NotFoundError, ConflictError } = require("../../errors/AppError");

function createProductsService({ productsRepository, shopsRepository }) {
  async function list({ page, pageSize, q, shopId, lowStock, sort }) {
    return productsRepository.list({ page, pageSize, q, shopId, lowStock, sort });
  }

  async function getById(id) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError("Product", "PRODUCT_NOT_FOUND");

    return product;
  }

  async function create(input) {
    const shop = await shopsRepository.findById(input.shopId);
    if (!shop) throw new NotFoundError("Shop", "SHOP_NOT_FOUND");

    const existing = await productsRepository.findBySku(input.shopId, input.sku);
    if (existing) {
      throw new ConflictError(
        `Product with SKU ${input.sku} already exists in this shop`,
        "SKU_ALREADY_EXISTS",
      );
    }

    return productsRepository.create(input);
  }

  async function update(id, input) {
    await getById(id);

    return productsRepository.update(id, input);
  }

  // Reguła 7: produkt z jakąkolwiek historią (ruchy magazynowe, pozycje zamówień) zostaje w bazie.
  async function remove(id) {
    await getById(id);

    if (await productsRepository.hasHistory(id)) {
      throw new ConflictError(
        "Product has stock movements or order items and cannot be deleted",
        "PRODUCT_IN_USE",
      );
    }

    await productsRepository.remove(id);
  }

  return { list, getById, create, update, remove };
}

module.exports = { createProductsService };
