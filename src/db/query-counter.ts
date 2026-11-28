import { AsyncLocalStorage } from "node:async_hooks";
import { after } from "next/server";
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external";
import type { Logger } from "drizzle-orm";

// Contador de consultas por petición (desarrollo). Drizzle avisa cada consulta a su `logger` en el mismo contexto
// asíncrono de quien la hace, así que basta con saber a qué petición pertenece ese contexto:
// - una página, un layout, un route handler o una server action: el store de trabajo que Next abre por petición;
// - un script o un test: `countQueries(fn)`, que abre su propio ámbito.
// Al terminar la petición (`after`) se resume: cuántas consultas hubo y qué sentencia se repitió. Una misma sentencia
// muchas veces en una petición es la firma de un N+1 (una consulta por fila en vez de una por lote).
// En producción está apagado por defecto: sin modo, el cliente se crea sin logger y no cuesta nada.

export type QueryCounterMode = "off" | "warn" | "all";

/** Veces que una misma sentencia puede repetirse en una petición antes de avisar. */
export const REPEAT_WARN_THRESHOLD = 5;
/** Consultas totales de una petición a partir de las cuales se avisa aunque ninguna se repita. */
export const TOTAL_WARN_THRESHOLD = 50;
/** Largo máximo de una sentencia en el aviso: lo justo para reconocerla. */
const STATEMENT_PREVIEW = 160;
/** Sentencias repetidas que se listan en el aviso. */
const REPEATED_SHOWN = 3;

/**
 * Modo a partir de `DB_QUERY_COUNTER`: `off`, `warn` (solo avisa las peticiones sospechosas) o `all` (una línea por
 * petición). Sin valor: `warn` fuera de producción y `off` en producción. Un valor desconocido falla al arrancar, para
 * no creer que se está midiendo cuando no.
 */
export function parseQueryCounterMode(value: string | undefined, nodeEnv: string | undefined): QueryCounterMode {
  const raw = value?.trim().toLowerCase();
  if (!raw) return nodeEnv === "production" ? "off" : "warn";
  if (raw === "off" || raw === "warn" || raw === "all") return raw;
  throw new Error(`DB_QUERY_COUNTER inválido: "${value}" (usa off, warn o all)`);
}

/**
 * Forma de una sentencia, para reconocer la misma consulta con otros parámetros: espacios colapsados y las listas de
 * parámetros (`$1, $2, $3` de un `IN` o un `VALUES`) reducidas a una, para que un lote de 3 y uno de 30 cuenten igual.
 */
export function normalizeStatement(statement: string): string {
  return statement
    .replace(/\s+/g, " ")
    .replace(/\$\d+(?:::\w+(?:\[\])?)?(?:\s*,\s*\$\d+(?:::\w+(?:\[\])?)?)+/g, "$…")
    .replace(/\(\$…\)(\s*,\s*\(\$…\))+/g, "($…)")
    .trim();
}

export interface QuerySummary {
  total: number;
  /** Sentencias repetidas, de la más repetida a la menos. */
  repeated: { statement: string; count: number }[];
}

export function summarizeQueries(statements: readonly string[]): QuerySummary {
  const counts = new Map<string, number>();
  for (const statement of statements) {
    const key = normalizeStatement(statement);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const repeated = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([statement, count]) => ({ statement, count }))
    .sort((a, b) => b.count - a.count || a.statement.localeCompare(b.statement));
  return { total: statements.length, repeated };
}

/** ¿La petición merece un aviso? Una sentencia repetida por encima del umbral o demasiadas consultas en total. */
export function isSuspicious(summary: QuerySummary): boolean {
  return summary.total >= TOTAL_WARN_THRESHOLD || (summary.repeated[0]?.count ?? 0) >= REPEAT_WARN_THRESHOLD;
}

function preview(statement: string): string {
  return statement.length > STATEMENT_PREVIEW ? `${statement.slice(0, STATEMENT_PREVIEW)}…` : statement;
}

/** La línea del registro: ruta, total y, si las hay, las sentencias más repetidas. */
export function formatQueryReport(route: string, summary: QuerySummary): string {
  const head = `[db] ${route} — ${summary.total} ${summary.total === 1 ? "consulta" : "consultas"}`;
  const top = summary.repeated.filter((item) => item.count >= REPEAT_WARN_THRESHOLD).slice(0, REPEATED_SHOWN);
  if (top.length === 0) return head;
  return [head + "; posible N+1:", ...top.map((item) => `  ${item.count}× ${preview(item.statement)}`)].join("\n");
}

interface Counter {
  statements: string[];
}

const scripted = new AsyncLocalStorage<Counter>();
/** Un contador por petición de Next, colgado de su store de trabajo (vive lo que vive la petición). */
const perRequest = new WeakMap<object, Counter>();

/**
 * Corre `fn` contando sus consultas, fuera de Next (scripts, smoke tests contra una BD real). Lo que `fn` deje
 * corriendo después de terminar ya no se cuenta en el resumen devuelto.
 */
export async function countQueries<T>(fn: () => Promise<T>): Promise<{ result: T; summary: QuerySummary }> {
  const counter: Counter = { statements: [] };
  const result = await scripted.run(counter, fn);
  return { result, summary: summarizeQueries([...counter.statements]) };
}

function report(mode: QueryCounterMode, route: string, counter: Counter): void {
  const summary = summarizeQueries(counter.statements);
  if (isSuspicious(summary)) console.warn(formatQueryReport(route, summary));
  else if (mode === "all") console.info(formatQueryReport(route, summary));
}

/** Cuenta la consulta en el ámbito del contexto actual; fuera de cualquier ámbito no hace nada. */
function record(mode: QueryCounterMode, statement: string): void {
  const own = scripted.getStore();
  if (own) {
    own.statements.push(statement);
    return;
  }
  const work = workAsyncStorage.getStore();
  if (!work) return;
  let counter = perRequest.get(work);
  if (!counter) {
    counter = { statements: [] };
    perRequest.set(work, counter);
    const created = counter;
    try {
      after(() => report(mode, work.route, created));
    } catch {
      // Un contexto donde Next no acepta `after` (p. ej. un prerender): se cuenta, pero no hay resumen.
    }
  }
  counter.statements.push(statement);
}

/** El logger para `drizzle(...)`, o `undefined` con el contador apagado. */
export function queryCounterLogger(mode: QueryCounterMode): Logger | undefined {
  if (mode === "off") return undefined;
  return { logQuery: (statement) => record(mode, statement) };
}
