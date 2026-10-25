const { z } = require("zod");
const { paginationSchema } = require("../../schemas/common");

const listShopsQuerySchema = z
  .object({
    ...paginationSchema,
    q: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

const createShopSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    contactEmail: z.email().max(255),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateShopSchema = createShopSchema.partial().strict();

module.exports = { listShopsQuerySchema, createShopSchema, updateShopSchema };
