const { toMovementResponse } = require("./stock.mapper");
const { toProductResponse } = require("../products/products.mapper");
const { paginate } = require("../../schemas/common");

function createStockController(stockService) {
  async function receive(req, res) {
    const product = await stockService.receive(req.validated.params.id, req.validated.body, req.user);

    res.json(toProductResponse(product));
  }

  async function adjust(req, res) {
    const product = await stockService.adjust(req.validated.params.id, req.validated.body, req.user);

    res.json(toProductResponse(product));
  }

  async function listMovements(req, res) {
    const { page, pageSize } = req.validated.query;
    const { data, total } = await stockService.listMovements(
      req.validated.params.id,
      { page, pageSize },
      req.user,
    );

    res.json(paginate({ data: data.map(toMovementResponse), total, page, pageSize }));
  }

  return { receive, adjust, listMovements };
}

module.exports = { createStockController };
