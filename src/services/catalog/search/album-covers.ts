// Carátulas de los discos de los resultados de canciones, en una sola consulta: cada disco llega al cliente con su
// carátula resuelta y la fila no pide `/cover` por su cuenta (un N+1 por HTTP). Los álbumes salen de varias fuentes
// (apariciones locales, browse remoto), así que se completan al final y no dentro de cada una.

import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup } from "@/db/schema";
import { coverFields, type CoverFields } from "../cover-resolution";
import type { SongGroupResult } from "./types";

/** Estado de carátula por `release_group.id`, en una consulta. */
export async function coverFieldsByReleaseGroup(ids: readonly string[]): Promise<Map<string, CoverFields>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({
      id: releaseGroup.id,
      coverThumbUrl: releaseGroup.coverThumbUrl,
      coverCheckedAt: releaseGroup.coverCheckedAt,
      coverBlockedAt: releaseGroup.coverBlockedAt,
    })
    .from(releaseGroup)
    .where(inArray(releaseGroup.id, unique));
  return new Map(rows.map((row) => [row.id, coverFields(row)]));
}

/** Los resultados con la carátula de cada disco; un disco que no aparece queda sin resolver (el cliente la pide). */
export async function withAlbumCovers(results: SongGroupResult[]): Promise<SongGroupResult[]> {
  const covers = await coverFieldsByReleaseGroup(results.flatMap((result) => result.albums.map((album) => album.id)));
  if (covers.size === 0) return results;
  return results.map((result) => ({
    ...result,
    albums: result.albums.map((album) => ({ ...album, ...(covers.get(album.id) ?? {}) })),
  }));
}
