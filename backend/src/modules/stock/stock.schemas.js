const { z } = require("zod");
const { paginationSchema } = require("../../schemas/common");

const receiptSchema = z
  .object({
    quantity: z.coerce.number().int().positive(),
    reason: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

// Korekta zawsze z powodem – inwentaryzacja musi być wytłumaczalna.
const adjustmentSchema = z
  .object({
    newQuantityOnHand: z.coerce.number().int().min(0),
    reason: z.string().trim().min(1).max(255),
  })
  .strict();

const listMovementsQuerySchema = z.object({ ...paginationSchema }).strict();

module.exports = { receiptSchema, adjustmentSchema, listMovementsQuerySchema };
