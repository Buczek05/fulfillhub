const { Router } = require("express");

const validate = require("../../middleware/validate");
const { idParamSchema } = require("../../schemas/common");
const { receiptSchema, adjustmentSchema, listMovementsQuerySchema } = require("./stock.schemas");

// Montowane pod /api/products – stany magazynowe są podzasobem produktu.
function createStockRouter(stockController) {
  const router = Router();

  router.post(
    "/:id/receipts",
    validate({ params: idParamSchema, body: receiptSchema }),
    stockController.receive,
  );
  router.post(
    "/:id/adjustments",
    validate({ params: idParamSchema, body: adjustmentSchema }),
    stockController.adjust,
  );
  router.get(
    "/:id/movements",
    validate({ params: idParamSchema, query: listMovementsQuerySchema }),
    stockController.listMovements,
  );

  return router;
}

module.exports = { createStockRouter };
