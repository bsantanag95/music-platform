import { AsyncLocalStorage } from "node:async_hooks";

// Guardia de transacciones (openspec: fix-cold-ingest-pool-exhaustion, ADR 0063). Una transacción abierta con el
// cliente global retiene una conexión del pool: si dentro se espera la red (MusicBrainz, Wikimedia, ListenBrainz)
// la conexión queda ocupada esperando, y si dentro se usa el cliente global se pide una SEGUNDA conexión, que con
// el pool lleno no llega nunca (deadlock). Este módulo marca con AsyncLocalStorage cuándo hay una transacción abierta
// en el contexto asíncrono y reporta ambas violaciones. No importa `@/db`: los clientes HTTP lo usan sin abrir la base.

interface TransactionScope {
  open: boolean;
}

const storage = new AsyncLocalStorage<TransactionScope>();

export class TransactionGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionGuardError";
  }
}

/** ¿Hay una transacción del cliente global abierta en este contexto asíncrono? */
export function isTransactionOpen(): boolean {
  return storage.getStore()?.open === true;
}

/**
 * Corre `fn` marcando el contexto como "transacción abierta". La marca se apaga al terminar: una promesa creada
 * dentro que sigue viva después ya no cuenta como violación.
 */
export async function runInTransactionScope<T>(fn: () => Promise<T>): Promise<T> {
  const scope: TransactionScope = { open: true };
  return storage.run(scope, async () => {
    try {
      return await fn();
    } finally {
      scope.open = false;
    }
  });
}

/** Fuera de producción lanza; en producción lo registra y deja seguir la request. */
export function reportTransactionViolation(what: string): void {
  const error = new TransactionGuardError(
    `${what} con una transacción abierta: una transacción no espera la red ni pide otra conexión del pool (ADR 0063)`,
  );
  if (process.env.NODE_ENV === "production") {
    console.error(error);
    return;
  }
  throw error;
}

/** La llaman los clientes de APIs externas antes de cada request. */
export function assertNoOpenTransaction(origin: string): void {
  if (isTransactionOpen()) reportTransactionViolation(`Request a ${origin}`);
}

/** Propiedades del cliente de Drizzle que ejecutan consultas (o las construyen para ejecutarlas sobre él). */
export const GUARDED_DB_MEMBERS: ReadonlySet<PropertyKey> = new Set([
  "select",
  "selectDistinct",
  "selectDistinctOn",
  "insert",
  "update",
  "delete",
  "execute",
  "query",
  "with",
  "$count",
  "refreshMaterializedView",
  "transaction",
]);

/**
 * Envuelve el cliente global: usarlo con una transacción abierta es una violación, y `transaction` abre el ámbito.
 * Los `tx` que crea Drizzle son otros objetos y no pasan por aquí.
 */
export function guardDatabase<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj, prop) {
      const value: unknown = Reflect.get(obj, prop, obj);
      if (!GUARDED_DB_MEMBERS.has(prop)) return value;
      if (isTransactionOpen()) reportTransactionViolation(`Uso de db.${String(prop)} (cliente global)`);
      if (typeof value !== "function") return value;
      if (prop === "transaction") {
        return (...args: unknown[]) => runInTransactionScope(() => (value as (...a: unknown[]) => Promise<unknown>).apply(obj, args));
      }
      return (value as (...a: unknown[]) => unknown).bind(obj);
    },
  });
}
