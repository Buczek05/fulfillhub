const { z } = require("zod");
const { paginationSchema } = require("../../schemas/common");

const ORDER_STATUSES = ["NEW", "PICKING", "PACKED", "SHIPPED", "CANCELLED"];

const listOrdersQuerySchema = z
  .object({
    ...paginationSchema,
    status: z.enum(ORDER_STATUSES).optional(),
    shopId: z.coerce.number().int().positive().optional(),
    q: z.string().trim().min(1).max(160).optional(),
  })
  .strict();

const orderItemSchema = z
  .object({
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
  })
  .strict();

const createOrderSchema = z
  .object({
    shopId: z.coerce.number().int().positive(),
    externalRef: z.string().trim().min(1).max(64),
    recipientName: z.string().trim().min(1).max(160),
    recipientAddress: z.string().trim().min(1).max(500),
    recipientEmail: z.email().max(255).nullable().optional(),
    items: z.array(orderItemSchema).min(1),
  })
  .strict();

// Tylko kroki kompletacji; wysyłka i anulowanie mają własne endpointy, bo robią więcej niż zmianę statusu.
const updateOrderStatusSchema = z
  .object({
    status: z.enum(["PICKING", "PACKED"]),
  })
  .strict();

const shipOrderSchema = z
  .object({
    carrier: z.string().trim().min(1).max(80),
    trackingNumber: z.string().trim().min(1).max(120),
  })
  .strict();

module.exports = {
  ORDER_STATUSES,
  listOrdersQuerySchema,
  createOrderSchema,
  updateOrderStatusSchema,
  shipOrderSchema,
};
