import { inArray } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { releaseGroup } from "@/db/schema";
import { findOrResolveCover } from "./cover";

// Carátulas de la portada del artista resueltas al cargar (openspec: refine-artist-stage, design «Carátulas con presupuesto»):
// las carátulas se resuelven de a poco, cuando la grilla las muestra, y un artista con mucha obra podía estrenar su portada con
// un solo disco. Si a Principal le faltan carátulas para llenar la portada, se resuelven aquí las de sus discos más recientes,
// en paralelo y con un tiempo de espera acotado; lo que no llega a tiempo termina después de responder. Mismas consultas a
// Cover Art Archive que haría la grilla (`findOrResolveCover`), ninguna a MusicBrainz.

/** Carátulas que se intentan resolver como mucho por visita. */
export const STAGE_RESOLVE_MAX = 12;
/** Espera máxima antes de responder con lo que haya llegado. */
export const STAGE_RESOLVE_BUDGET_MS = 1500;

export interface StageCoverCandidate {
  id: string;
  year: number | null;
  coverThumbUrl: string | null;
  coverResolved: boolean;
}

/**
 * Discos de Principal cuya carátula conviene resolver: solo si las resueltas no llegan a `min(discos, wallMin)`; los que
 * no tienen resolución, del más reciente al más antiguo (sin año al final), hasta `STAGE_RESOLVE_MAX`.
 */
export function stageCoversToResolve(items: StageCoverCandidate[], wallMin: number): string[] {
  const withCover = items.filter((item) => item.coverResolved && item.coverThumbUrl).length;
  if (withCover >= Math.min(items.length, wallMin)) return [];
  const pending = items.filter((item) => !item.coverResolved);
  const dated = pending.filter((item) => item.year !== null).sort((a, b) => b.year! - a.year!);
  const undated = pending.filter((item) => item.year === null);
  return [...dated, ...undated].slice(0, STAGE_RESOLVE_MAX).map((item) => item.id);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Resuelve las carátulas de `ids` en paralelo y devuelve las URL que llegaron dentro del presupuesto. Las que siguen en
 * curso se dejan terminar con `after()`; un error de una no afecta a las demás.
 */
export async function resolveStageCovers(ids: string[], budgetMs = STAGE_RESOLVE_BUDGET_MS): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  if (ids.length === 0) return resolved;
  const rows = await db.select().from(releaseGroup).where(inArray(releaseGroup.id, ids));
  const tasks = rows.map(async (row) => {
    const url = await findOrResolveCover(row);
    if (url) resolved.set(row.id, url);
  });
  const all = Promise.allSettled(tasks);
  await Promise.race([all, sleep(budgetMs)]);
  // Copia: lo que llegue tarde ya no cambia esta respuesta, pero queda guardado para la próxima visita.
  const inTime = new Map(resolved);
  after(() => all.then(() => undefined));
  return inTime;
}
