import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { isTransactionOpen, reportTransactionViolation } from "./transaction-guard";

// Sincronizaciones con candado corto (openspec: fix-cold-ingest-pool-exhaustion, ADR 0063). Cada sincronización del
// catálogo lee su estado sin transacción, pide a la API externa FUERA de toda transacción y escribe en una
// transacción corta que toma el candado de la entidad, relee y escribe solo si sigue pendiente. El single-flight
// cubre lo que antes cubría el candado alrededor de la red: dos visitas simultáneas en el mismo proceso hacen una
// sola request. Mismo supuesto de proceso único que la cola de MusicBrainz.

/** Ejecutor de una transacción de Drizzle sobre el cliente global. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Contexto asíncrono de la carga del módulo: el de ninguna request. La ejecución compartida corre ahí porque no le
 * pertenece a la request que llegó primero. Si naciera en su contexto, en desarrollo el rastreo de I/O de React la
 * atribuiría a esa request y la otra request que la espera rompería el render ("Cannot read properties of undefined
 * (reading 'run')" en `initializeFakeTask`, medido con 8 visitas en frío concurrentes en `next dev`).
 */
const runDetached = AsyncLocalStorage.snapshot();

/**
 * Las llamadas concurrentes con la misma `key` comparten una única ejecución de `task` y su resultado (o su error).
 * Al terminar, la clave se libera: la siguiente llamada vuelve a ejecutar. `task` corre fuera del contexto de la
 * request (sin `after()`, `cookies()` ni `headers()`): solo lee y escribe la base y llama a las APIs externas.
 */
export function singleFlight<T>(key: string, task: () => Promise<T>): Promise<T> {
  // Una sincronización va a la red: nunca con una transacción abierta (ADR 0063). Se comprueba aquí, en el
  // contexto de quien llama, porque `task` corre desligada y la guardia de los clientes ya no la vería.
  if (isTransactionOpen()) reportTransactionViolation(`Sincronización ${key}`);
  const running = inFlight.get(key);
  if (running) return running as Promise<T>;
  const promise: Promise<T> = runDetached(() => Promise.resolve().then(task)).finally(() => {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

/** Ejecuciones en curso: solo para tests. */
export function inFlightCountForTests(): number {
  return inFlight.size;
}

/**
 * Corre `fn` dentro de `tx` si la hay (el llamador ya abrió la transacción) o en una transacción propia. Para
 * escrituras atómicas que también se usan desde una sincronización con candado.
 */
export function inTransaction<T>(tx: Tx | undefined, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return tx ? fn(tx) : db.transaction(fn);
}

/**
 * Transacción corta con el `pg_advisory_xact_lock` de la entidad. `fn` SHALL releer el estado y usar solo `tx`:
 * dentro no se espera la red (la guardia de `@/db/transaction-guard` lo impide fuera de producción).
 */
export function withEntityLock<T>(lockKey: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
    return fn(tx);
  });
}
