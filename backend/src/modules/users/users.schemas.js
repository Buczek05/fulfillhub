const { z } = require("zod");
const { paginationSchema } = require("../../schemas/common");

const ROLES = ["ADMIN", "WAREHOUSE", "SHOP"];

const listUsersQuerySchema = z
  .object({
    ...paginationSchema,
    role: z.enum(ROLES).optional(),
    q: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

// Konto SHOP musi mieć sklep, ADMIN i WAREHOUSE nie mogą go mieć – tak samo jak CHECK w bazie.
const shopIdMatchesRole = (data, ctx) => {
  if (data.role === "SHOP" && (data.shopId === undefined || data.shopId === null)) {
    ctx.addIssue({ code: "custom", path: ["shopId"], message: "shopId is required for role SHOP" });
  }
  if (data.role !== "SHOP" && data.shopId !== undefined && data.shopId !== null) {
    ctx.addIssue({ code: "custom", path: ["shopId"], message: "shopId is only allowed for role SHOP" });
  }
};

const createUserSchema = z
  .object({
    email: z.email().max(255),
    password: z.string().min(8).max(100),
    role: z.enum(ROLES),
    shopId: z.coerce.number().int().positive().nullable().optional(),
  })
  .strict()
  .superRefine(shopIdMatchesRole);

const updateUserSchema = z
  .object({
    email: z.email().max(255).optional(),
    password: z.string().min(8).max(100).optional(),
    role: z.enum(ROLES).optional(),
    shopId: z.coerce.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

module.exports = { ROLES, listUsersQuerySchema, createUserSchema, updateUserSchema };
