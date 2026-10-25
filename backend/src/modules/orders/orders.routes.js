const { Router } = require("express");

const validate = require("../../middleware/validate");
const { idParamSchema } = require("../../schemas/common");
const {
  listOrdersQuerySchema,
  createOrderSchema,
  updateOrderStatusSchema,
  shipOrderSchema,
} = require("./orders.schemas");

function createOrdersRouter(ordersController) {
  const router = Router();

  router.get("/", validate({ query: listOrdersQuerySchema }), ordersController.listOrders);
  router.post("/", validate({ body: createOrderSchema }), ordersController.createOrder);
  router.get("/:id", validate({ params: idParamSchema }), ordersController.getOrder);
  router.patch(
    "/:id/status",
    validate({ params: idParamSchema, body: updateOrderStatusSchema }),
    ordersController.updateOrderStatus,
  );
  router.post(
    "/:id/ship",
    validate({ params: idParamSchema, body: shipOrderSchema }),
    ordersController.shipOrder,
  );
  router.post("/:id/cancel", validate({ params: idParamSchema }), ordersController.cancelOrder);

  return router;
}

module.exports = { createOrdersRouter };
