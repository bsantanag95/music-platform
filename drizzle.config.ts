import type { Config } from "drizzle-kit";

// Nota: no se usa `drizzle-kit generate` en este proyecto (ver ADR 0005).
// Esta config sirve para `drizzle-kit studio` y para introspección puntual,
// no como fuente de las migraciones — esas viven a mano en /drizzle/*.sql.
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
