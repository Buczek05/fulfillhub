const { NotFoundError, ConflictError } = require("../../errors/AppError");
const { isShop, assertOwnedByActor } = require("../../schemas/scope");

function createShopsService({ shopsRepository, productsRepository, ordersRepository }) {
  // Sklep widzi na liście wyłącznie samego siebie.
  async function list({ page, pageSize, q }, actor = null) {
    if (isShop(actor)) {
      const shop = await shopsRepository.findById(actor.shopId);

      return { data: shop ? [shop] : [], total: shop ? 1 : 0 };
    }

    return shopsRepository.list({ page, pageSize, q });
  }

  async function getById(id, actor = null) {
    assertOwnedByActor(actor, id, "Shop");

    const shop = await shopsRepository.findById(id);
    if (!shop) throw new NotFoundError("Shop", "SHOP_NOT_FOUND");

    return shop;
  }

  async function create(input) {
    return shopsRepository.create({ isActive: true, ...input });
  }

  async function update(id, input) {
    await getById(id);

    return shopsRepository.update(id, input);
  }

  // Sklepu z produktami albo zamówieniami nie kasujemy – historia magazynu musi zostać spójna.
  async function remove(id) {
    await getById(id);

    const [products, orders] = await Promise.all([
      productsRepository.countByShop(id),
      ordersRepository.countByShop(id),
    ]);

    if (products > 0 || orders > 0) {
      throw new ConflictError(
        "Shop still has products or orders and cannot be deleted",
        "SHOP_IN_USE",
        { products, orders },
      );
    }

    await shopsRepository.remove(id);
  }

  return { list, getById, create, update, remove };
}

module.exports = { createShopsService };
