// Resolución de carátulas al generar colecciones (openspec: add-day-zero-collections, ADR 0035).
// Camino de producción de `findOrResolveCover` (Cover Art Archive, sin la cola de MusicBrainz): un
// disco con carátula resuelta no cuesta nada; uno sin resolver cuesta una petición a CAA dentro de un
// presupuesto por corrida. Lo ya resuelto queda guardado en `release_group`, así que una corrida
// que se queda sin presupuesto deja trabajo hecho para la siguiente.

import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup, type ReleaseGroupRow } from "@/db/schema";
import { findOrResolveCover } from "@/services/catalog/cover";
import { isCoverResolved } from "@/services/catalog/cover-resolution";
import { COVER_RESOLVE_BUDGET, COVER_RESOLVE_CONCURRENCY } from "../constants";

export interface CoverResolver {
  /** Primer id con carátula, resolviendo en orden dentro del presupuesto; `null` si ninguno. */
  first(ids: string[]): Promise<string | null>;
  /** Hasta `limit` ids con carátula, conservando el orden recibido. */
  take(ids: string[], limit: number): Promise<string[]>;
  /** Peticiones a Cover Art Archive hechas hasta ahora. */
  readonly spent: number;
  /** `true` si el presupuesto se agotó y se dejaron discos sin resolver. */
  readonly exhausted: boolean;
}

export type FindCover = (row: ReleaseGroupRow) => Promise<string | null>;

export function createCoverResolver(
  budget = COVER_RESOLVE_BUDGET,
  find: FindCover = findOrResolveCover,
): CoverResolver {
  let spent = 0;
  let exhausted = false;
  const rows = new Map<string, ReleaseGroupRow>();
  // Veredicto por disco: un disco ya resuelto (o descartado) no vuelve a costar una petición aunque
  // otra consulta de la misma corrida lo proponga de nuevo.
  const verdicts = new Map<string, boolean>();

  async function load(ids: string[]): Promise<void> {
    const missing = ids.filter((id) => !rows.has(id));
    if (missing.length === 0) return;
    const found = await db.select().from(releaseGroup).where(inArray(releaseGroup.id, missing));
    for (const row of found) rows.set(row.id, row);
  }

  /** `true` si el disco tiene carátula (resolviéndola si hace falta y queda presupuesto). */
  async function hasCover(id: string): Promise<boolean> {
    const known = verdicts.get(id);
    if (known !== undefined) return known;
    const verdict = await decide(id);
    // Si el presupuesto se agotó antes de intentarlo, el disco queda sin veredicto: otra corrida lo resolverá.
    if (verdict !== null) verdicts.set(id, verdict);
    return verdict ?? false;
  }

  async function decide(id: string): Promise<boolean | null> {
    const row = rows.get(id);
    if (!row || row.coverBlockedAt) return false;
    if (row.coverThumbUrl) return true;
    if (isCoverResolved(row)) return false; // ausencia ya confirmada dentro de la ventana de negativos
    if (spent >= budget) {
      exhausted = true;
      return null;
    }
    spent += 1;
    return (await find(row)) !== null;
  }

  async function take(ids: string[], limit: number): Promise<string[]> {
    const unique = [...new Set(ids)];
    await load(unique);
    const picked: string[] = [];
    for (let start = 0; start < unique.length && picked.length < limit; start += COVER_RESOLVE_CONCURRENCY) {
      const batch = unique.slice(start, start + COVER_RESOLVE_CONCURRENCY);
      const results = await Promise.all(batch.map((id) => hasCover(id)));
      batch.forEach((id, index) => {
        if (results[index] && picked.length < limit) picked.push(id);
      });
    }
    return picked;
  }

  return {
    first: async (ids) => (await take(ids, 1))[0] ?? null,
    take,
    get spent() {
      return spent;
    },
    get exhausted() {
      return exhausted;
    },
  };
}
