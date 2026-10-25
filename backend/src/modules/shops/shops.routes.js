const { Router } = require("express");

const validate = require("../../middleware/validate");
const { idParamSchema } = require("../../schemas/common");
const { listShopsQuerySchema, createShopSchema, updateShopSchema } = require("./shops.schemas");

function createShopsRouter(shopsController) {
  const router = Router();

  router.get("/", validate({ query: listShopsQuerySchema }), shopsController.listShops);
  router.post("/", validate({ body: createShopSchema }), shopsController.createShop);
  router.get("/:id", validate({ params: idParamSchema }), shopsController.getShop);
  router.patch(
    "/:id",
    validate({ params: idParamSchema, body: updateShopSchema }),
    shopsController.updateShop,
  );
  router.delete("/:id", validate({ params: idParamSchema }), shopsController.deleteShop);

  return router;
}

module.exports = { createShopsRouter };
