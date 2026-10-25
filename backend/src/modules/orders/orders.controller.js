const { toOrderResponse, toOrderSummaryResponse } = require("./orders.mapper");
const { paginate } = require("../../schemas/common");

function createOrdersController(ordersService) {
  async function listOrders(req, res) {
    const { page, pageSize, status, shopId, q } = req.validated.query;
    const { data, total } = await ordersService.list({ page, pageSize, status, shopId, q }, req.user);

    res.json(paginate({ data: data.map(toOrderSummaryResponse), total, page, pageSize }));
  }

  async function getOrder(req, res) {
    const order = await ordersService.getById(req.validated.params.id, req.user);

    res.json(toOrderResponse(order));
  }

  async function createOrder(req, res) {
    const order = await ordersService.create(req.validated.body, req.user);

    res.status(201).location(`/api/orders/${order.id}`).json(toOrderResponse(order));
  }

  async function updateOrderStatus(req, res) {
    const order = await ordersService.changeStatus(
      req.validated.params.id,
      req.validated.body.status,
    );

    res.json(toOrderResponse(order));
  }

  async function shipOrder(req, res) {
    const order = await ordersService.ship(req.validated.params.id, req.validated.body, req.user);

    res.json(toOrderResponse(order));
  }

  async function cancelOrder(req, res) {
    const order = await ordersService.cancel(req.validated.params.id, req.user);

    res.json(toOrderResponse(order));
  }

  return { listOrders, getOrder, createOrder, updateOrderStatus, shipOrder, cancelOrder };
}

module.exports = { createOrdersController };
