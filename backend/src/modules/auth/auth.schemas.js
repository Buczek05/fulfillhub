const { z } = require("zod");

const loginSchema = z
  .object({
    email: z.email().max(255),
    password: z.string().min(1).max(100),
  })
  .strict();

module.exports = { loginSchema };
