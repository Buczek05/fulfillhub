const { Router } = require("express");

const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { idParamSchema } = require("../../schemas/common");
const {
  listProductsQuerySchema,
  createProductSchema,
  updateProductSchema,
} = require("./products.schemas");

function createProductsRouter(productsController) {
  const router = Router();

  router.get("/", validate({ query: listProductsQuerySchema }), productsController.listProducts);
  router.post(
    "/",
    authorize("ADMIN", "SHOP"),
    validate({ body: createProductSchema }),
    productsController.createProduct,
  );
  router.get("/:id", validate({ params: idParamSchema }), productsController.getProduct);
  router.patch(
    "/:id",
    authorize("ADMIN", "SHOP"),
    validate({ params: idParamSchema, body: updateProductSchema }),
    productsController.updateProduct,
  );
  router.delete(
    "/:id",
    authorize("ADMIN", "SHOP"),
    validate({ params: idParamSchema }),
    productsController.deleteProduct,
  );

  return router;
}

module.exports = { createProductsRouter };
