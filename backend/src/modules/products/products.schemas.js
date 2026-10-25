const { z } = require("zod");
const { paginationSchema } = require("../../schemas/common");

const SORTABLE = ["id", "sku", "name", "quantityOnHand", "createdAt"];

const listProductsQuerySchema = z
  .object({
    ...paginationSchema,
    q: z.string().trim().min(1).max(200).optional(),
    shopId: z.coerce.number().int().positive().optional(),
    lowStock: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    // np. "sku" rosnąco, "-createdAt" malejąco
    sort: z
      .string()
      .refine((value) => SORTABLE.includes(value.replace(/^-/, "")), {
        message: `sort must be one of: ${SORTABLE.join(", ")} (prefix with "-" for descending)`,
      })
      .optional(),
  })
  .strict();

const createProductSchema = z
  .object({
    shopId: z.coerce.number().int().positive(),
    sku: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(200),
    ean: z.string().trim().min(8).max(32).nullable().optional(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
  })
  .strict();

// SKU i sklepu nie zmieniamy – identyfikują towar w historii magazynu.
const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    ean: z.string().trim().min(8).max(32).nullable().optional(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
  })
  .strict();

module.exports = { listProductsQuerySchema, createProductSchema, updateProductSchema, SORTABLE };
