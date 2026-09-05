import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("Falta DATABASE_URL en las variables de entorno");
}

// En desarrollo, HMR re-evalúa este módulo en cada guardado. Sin cachear el
// cliente en globalThis, cada recompilación abre un pool nuevo que nunca se
// cierra y termina agotando max_connections de Postgres ("demasiados clientes").
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.pgClient ?? postgres(process.env.DATABASE_URL, { max: 5 });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
