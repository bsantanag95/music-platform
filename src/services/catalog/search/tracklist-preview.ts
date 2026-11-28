import { and, asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { recording, release, track } from "@/db/schema";

// Primeras canciones de un disco para la ficha de Álbumes de /search (openspec: redesign-search-phase2, design D3). Solo
// lee lo ya guardado: la edición representativa y sus pistas. Sin edición guardada devuelve `null` y la ficha va sin
// canciones. La búsqueda no ingiere (spec catalog-search): esta función nunca consulta MusicBrainz.

export interface TracklistPreview {
  titles: string[];
  total: number;
}

export async function getStoredTracklistPreview(releaseGroupId: string, limit = 6): Promise<TracklistPreview | null> {
  const [representative] = await db
    .select({ id: release.id })
    .from(release)
    .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.isRepresentative, true)))
    .limit(1);
  if (!representative) return null;

  const [rows, [totals]] = await Promise.all([
    db
      .select({ title: recording.title })
      .from(track)
      .innerJoin(recording, eq(track.recordingId, recording.id))
      .where(eq(track.releaseId, representative.id))
      .orderBy(asc(track.discNumber), asc(track.position), asc(recording.id))
      .limit(limit),
    db.select({ total: count() }).from(track).where(eq(track.releaseId, representative.id)),
  ]);
  if (rows.length === 0) return null;
  return { titles: rows.map((row) => row.title), total: totals?.total ?? rows.length };
}
