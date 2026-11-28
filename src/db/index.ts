import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { IDLE_IN_TRANSACTION_TIMEOUT_MS, parsePoolMax } from "./pool-config";
import { guardDatabase } from "./transaction-guard";
import { parseQueryCounterMode, queryCounterLogger } from "./query-counter";

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
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL, {
    max: parsePoolMax(process.env.DATABASE_POOL_MAX),
    // Red de seguridad (ADR 0063): una transacción olvidada se aborta en vez de retener su conexión.
    connection: { idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS },
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

// El cliente global va envuelto en la guardia de transacciones (`transaction-guard.ts`): usarlo dentro de una
// transacción pediría una segunda conexión del pool.
// Contador de consultas por petición (`query-counter.ts`): en desarrollo avisa las peticiones con una sentencia
// repetida (N+1); en producción, apagado salvo que `DB_QUERY_COUNTER` lo pida.
const logger = queryCounterLogger(parseQueryCounterMode(process.env.DB_QUERY_COUNTER, process.env.NODE_ENV));

export const db = guardDatabase(drizzle(client, { schema, logger }));
