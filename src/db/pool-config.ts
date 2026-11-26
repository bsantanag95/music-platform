// Configuración del pool de Postgres (openspec: fix-cold-ingest-pool-exhaustion, ADR 0063).

/** Por defecto: varias worktrees y `next dev` comparten el mismo Postgres local. */
export const DEFAULT_POOL_MAX = 5;

/**
 * Con ninguna transacción esperando la red, 60 s sin sentencias solo puede ser un error: Postgres la aborta y la
 * conexión vuelve al pool en vez de quedar retenida para siempre.
 */
export const IDLE_IN_TRANSACTION_TIMEOUT_MS = 60_000;

/** `DATABASE_POOL_MAX`: entero positivo; vacío o ausente → 5. */
export function parsePoolMax(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_POOL_MAX;
  const value = Number(raw.trim());
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`DATABASE_POOL_MAX debe ser un entero positivo (recibido: "${raw}")`);
  }
  return value;
}
