const { toProductResponse } = require("./products.mapper");
const { paginate } = require("../../schemas/common");

function createProductsController(productsService) {
  async function listProducts(req, res) {
    const { page, pageSize, q, shopId, lowStock, sort } = req.validated.query;
    const { data, total } = await productsService.list({ page, pageSize, q, shopId, lowStock, sort });

    res.json(paginate({ data: data.map(toProductResponse), total, page, pageSize }));
  }

  async function getProduct(req, res) {
    const product = await productsService.getById(req.validated.params.id);

    res.json(toProductResponse(product));
  }

  async function createProduct(req, res) {
    const product = await productsService.create(req.validated.body);

    res.status(201).location(`/api/products/${product.id}`).json(toProductResponse(product));
  }

  async function updateProduct(req, res) {
    const product = await productsService.update(req.validated.params.id, req.validated.body);

    res.json(toProductResponse(product));
  }

  async function deleteProduct(req, res) {
    await productsService.remove(req.validated.params.id);

    res.status(204).end();
  }

  return { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
}

module.exports = { createProductsController };
