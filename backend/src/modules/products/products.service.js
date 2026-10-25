const { NotFoundError, ConflictError } = require("../../errors/AppError");
const { isShop, scopeShopId, assertOwnedByActor } = require("../../schemas/scope");

function createProductsService({ productsRepository, shopsRepository }) {
  async function list({ page, pageSize, q, shopId, lowStock, sort }, actor = null) {
    return productsRepository.list({
      page,
      pageSize,
      q,
      shopId: scopeShopId(actor, shopId),
      lowStock,
      sort,
    });
  }

  async function getById(id, actor = null) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError("Product", "PRODUCT_NOT_FOUND");

    assertOwnedByActor(actor, product.shopId, "Product");

    return product;
  }

  async function create(input, actor = null) {
    // Sklep zakłada produkty wyłącznie u siebie, niezależnie od tego, co przyszło w body.
    const shopId = isShop(actor) ? actor.shopId : input.shopId;

    const shop = await shopsRepository.findById(shopId);
    if (!shop) throw new NotFoundError("Shop", "SHOP_NOT_FOUND");

    const existing = await productsRepository.findBySku(shopId, input.sku);
    if (existing) {
      throw new ConflictError(
        `Product with SKU ${input.sku} already exists in this shop`,
        "SKU_ALREADY_EXISTS",
      );
    }

    return productsRepository.create({ ...input, shopId });
  }

  async function update(id, input, actor = null) {
    await getById(id, actor);

    return productsRepository.update(id, input);
  }

  // Reguła 7: produkt z jakąkolwiek historią (ruchy magazynowe, pozycje zamówień) zostaje w bazie.
  async function remove(id, actor = null) {
    await getById(id, actor);

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
