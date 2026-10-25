const { toShopResponse } = require("./shops.mapper");
const { paginate } = require("../../schemas/common");

function createShopsController(shopsService) {
  async function listShops(req, res) {
    const { page, pageSize, q } = req.validated.query;
    const { data, total } = await shopsService.list({ page, pageSize, q }, req.user);

    res.json(paginate({ data: data.map(toShopResponse), total, page, pageSize }));
  }

  async function getShop(req, res) {
    const shop = await shopsService.getById(req.validated.params.id, req.user);

    res.json(toShopResponse(shop));
  }

  async function createShop(req, res) {
    const shop = await shopsService.create(req.validated.body);

    res.status(201).location(`/api/shops/${shop.id}`).json(toShopResponse(shop));
  }

  async function updateShop(req, res) {
    const shop = await shopsService.update(req.validated.params.id, req.validated.body);

    res.json(toShopResponse(shop));
  }

  async function deleteShop(req, res) {
    await shopsService.remove(req.validated.params.id);

    res.status(204).end();
  }

  return { listShops, getShop, createShop, updateShop, deleteShop };
}

module.exports = { createShopsController };
