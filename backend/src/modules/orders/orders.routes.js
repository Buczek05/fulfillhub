const { Router } = require("express");

const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
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
  router.post(
    "/",
    authorize("ADMIN", "SHOP"),
    validate({ body: createOrderSchema }),
    ordersController.createOrder,
  );
  router.get("/:id", validate({ params: idParamSchema }), ordersController.getOrder);
  router.patch(
    "/:id/status",
    authorize("ADMIN", "WAREHOUSE"),
    validate({ params: idParamSchema, body: updateOrderStatusSchema }),
    ordersController.updateOrderStatus,
  );
  router.post(
    "/:id/ship",
    authorize("ADMIN", "WAREHOUSE"),
    validate({ params: idParamSchema, body: shipOrderSchema }),
    ordersController.shipOrder,
  );
  router.post("/:id/cancel", validate({ params: idParamSchema }), ordersController.cancelOrder);

  return router;
}

module.exports = { createOrdersRouter };
