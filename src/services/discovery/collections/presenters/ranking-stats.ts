import { and, count, gte, inArray, lt, avg } from "drizzle-orm";
import { db } from "@/db";
import { rating } from "@/db/schema";
import type { PeriodBounds } from "./period";

// Cifras de los rankings de la comunidad para presentarlos (openspec: add-remaining-collection-presenters): una
// consulta por dato y por lote sobre los discos de la colección, nunca una por disco. Usan el período del propio
// ranking —no todo el tiempo— y los mismos filtros que la plantilla, para que la cifra coincida con la que lo armó.

export interface RatingStat {
  average: number;
  count: number;
}

/** Valoración promedio y número de valoraciones de cada álbum dentro del período. */
export async function ratingStats(albumIds: string[], bounds: PeriodBounds): Promise<Map<string, RatingStat>> {
  const stats = new Map<string, RatingStat>();
  if (albumIds.length === 0) return stats;
  const rows = await db
    .select({ id: rating.releaseGroupId, average: avg(rating.stars), total: count() })
    .from(rating)
    .where(
      and(
        inArray(rating.releaseGroupId, albumIds),
        gte(rating.createdAt, new Date(bounds.start)),
        lt(rating.createdAt, new Date(bounds.end)),
      ),
    )
    .groupBy(rating.releaseGroupId);
  for (const row of rows) {
    if (row.id) stats.set(row.id, { average: Number(row.average), count: Number(row.total) });
  }
  return stats;
}
