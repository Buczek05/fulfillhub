const path = require("node:path");
const { z } = require("zod");

// Ścieżka liczona od pliku, nie od cwd: CLI Knexa uruchamia się z katalogu src/db.
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

// Jedyne miejsce, które czyta process.env. Brak wymaganej zmiennej przerywa start aplikacji.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_FROM: z.string().default("FulfillHub <no-reply@fulfillhub.local>"),
  CORS_ORIGIN: z.string().default("http://localhost:4200"),
});

function loadConfig(env = process.env) {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  const parsed = result.data;

  return {
    env: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === "production",
    port: parsed.PORT,
    corsOrigin: parsed.CORS_ORIGIN,
    database: { url: parsed.DATABASE_URL },
    jwt: { secret: parsed.JWT_SECRET, expiresIn: parsed.JWT_EXPIRES_IN },
    mail: { host: parsed.SMTP_HOST, port: parsed.SMTP_PORT, from: parsed.MAIL_FROM },
  };
}

module.exports = { loadConfig };
