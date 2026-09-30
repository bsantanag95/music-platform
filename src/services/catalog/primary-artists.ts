import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { artist, credit } from "@/db/schema";

// Resolvedor por lotes del artista principal de álbumes y canciones (openspec:
// add-catalog-slugs, design D6): el primer crédito `primary` por `position`
// (los `featured` quedan fuera), con el tipo para marcar `various`. Una sola
// consulta por lote y por tipo de objetivo, no una por fila.

export interface PrimaryArtistRef {
  id: string;
  name: string;
  type: string | null;
}

export interface PrimaryArtistsMaps {
  /** release_group id → primer crédito principal. */
  releaseGroups: Map<string, PrimaryArtistRef>;
  /** recording id → primer crédito principal. */
  recordings: Map<string, PrimaryArtistRef>;
}

/**
 * Nombre a usar en el slug. Un artista `various` ("Various Artists") o sin
 * crédito produce `null`: el slug de álbum y canción es solo el título.
 */
export function slugArtistName(ref: PrimaryArtistRef | null | undefined): string | null {
  if (!ref || ref.type === "various") return null;
  return ref.name;
}

function pickFirstByPosition<T extends { position: number }>(
  rows: T[],
  keyOf: (row: T) => string | null,
): Map<string, T> {
  const picked = new Map<string, T>();
  for (const row of [...rows].sort((a, b) => a.position - b.position)) {
    const key = keyOf(row);
    if (key !== null && !picked.has(key)) picked.set(key, row);
  }
  return picked;
}

export async function resolvePrimaryArtists(ids: {
  releaseGroupIds?: string[];
  recordingIds?: string[];
}): Promise<PrimaryArtistsMaps> {
  const releaseGroupIds = ids.releaseGroupIds ?? [];
  const recordingIds = ids.recordingIds ?? [];

  const [releaseGroupRows, recordingRows] = await Promise.all([
    releaseGroupIds.length
      ? db
          .select({
            id: artist.id,
            name: artist.name,
            type: artist.type,
            position: credit.position,
            releaseGroupId: credit.releaseGroupId,
          })
          .from(credit)
          .innerJoin(artist, eq(artist.id, credit.artistId))
          .where(
            and(
              inArray(credit.releaseGroupId, releaseGroupIds),
              eq(credit.role, "primary"),
              isNull(credit.recordingId),
            ),
          )
          .orderBy(asc(credit.position))
      : Promise.resolve([]),
    recordingIds.length
      ? db
          .select({
            id: artist.id,
            name: artist.name,
            type: artist.type,
            position: credit.position,
            recordingId: credit.recordingId,
          })
          .from(credit)
          .innerJoin(artist, eq(artist.id, credit.artistId))
          .where(and(inArray(credit.recordingId, recordingIds), eq(credit.role, "primary")))
          .orderBy(asc(credit.position))
      : Promise.resolve([]),
  ]);

  const releaseGroups = pickFirstByPosition(releaseGroupRows, (row) => row.releaseGroupId);
  const recordings = pickFirstByPosition(recordingRows, (row) => row.recordingId);
  return {
    releaseGroups: new Map([...releaseGroups].map(([id, row]) => [id, { id: row.id, name: row.name, type: row.type }])),
    recordings: new Map([...recordings].map(([id, row]) => [id, { id: row.id, name: row.name, type: row.type }])),
  };
}
