import { eq } from "drizzle-orm";
import { db } from "@/db";
import { release, recording, track, type ReleaseRow } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import { normalizeReleaseDate } from "../musicbrainz/mappers";
import { ingestCredits } from "./ingest-discography";

/**
 * Trae y cachea el tracklist de la edición "oficial" de un release-group
 * (o la primera disponible si no hay ninguna marcada como oficial).
 * Simplificación de la Fase 2: se ingiere una sola edición por álbum;
 * ingerir ediciones alternativas (japonesa, remaster) queda para cuando
 * el modelo de selección de edición se implemente en el frontend.
 *
 * Nota: si el release ya existe se devuelve tal cual, sin llamadas a
 * MusicBrainz. Los releases cacheados antes de la ingesta de créditos se
 * re-sincronizan con el script `scripts/backfill-release-credits.ts`,
 * nunca dentro del path de lectura del álbum (una caída de MusicBrainz
 * no debe romper la vista de álbum).
 */
export async function findOrIngestTracklist(
  releaseGroupId: string,
  releaseGroupMbid: string,
): Promise<ReleaseRow | null> {
  const [existing] = await db
    .select()
    .from(release)
    .where(eq(release.releaseGroupId, releaseGroupId))
    .limit(1);

  if (existing) return existing;

  const rgWithReleases = await musicbrainz.getReleaseGroup(releaseGroupMbid);
  const chosen =
    rgWithReleases.releases?.find((r) => r.status === "Official") ?? rgWithReleases.releases?.[0];
  if (!chosen) return null;

  const full = await musicbrainz.getRelease(chosen.id);
  const releaseDate = normalizeReleaseDate(full.date);

  // La carátula ya no se resuelve acá: vive en `release_group.cover_thumb_url`
  // (patrón cover-only, ver services/catalog/cover.ts) y `release.cover_thumb_url`
  // quedó deprecada. El read-model la lee de release_group.
  const insertedReleases = await db
    .insert(release)
    .values({
      mbid: full.id,
      releaseGroupId,
      editionLabel: "original",
      releaseDate,
      creditsSyncedAt: new Date(),
    })
    .onConflictDoUpdate({ target: release.mbid, set: { releaseDate } })
    .returning();

  const releaseRow = insertedReleases[0];
  if (!releaseRow) throw new Error(`No se pudo hacer upsert de la edición ${full.id}`);

  for (const medium of full.media ?? []) {
    for (const mbTrack of medium.tracks) {
      const insertedRecordings = await db
        .insert(recording)
        .values({
          mbid: mbTrack.recording.id,
          title: mbTrack.recording.title,
          durationSec: mbTrack.recording.length
            ? Math.round(mbTrack.recording.length / 1000)
            : null,
        })
        .onConflictDoUpdate({ target: recording.mbid, set: { title: mbTrack.recording.title } })
        .returning();

      const recordingRow = insertedRecordings[0];
      if (!recordingRow) continue;

      await db
        .insert(track)
        .values({
          releaseId: releaseRow.id,
          recordingId: recordingRow.id,
          discNumber: medium.position,
          position: mbTrack.position,
        })
        .onConflictDoNothing();

      if (mbTrack["artist-credit"]?.length) {
        await ingestCredits(mbTrack["artist-credit"], { recordingId: recordingRow.id });
      }
    }
  }

  return releaseRow;
}

/**
 * Sincroniza los créditos de un release existente sin re-ingestar el tracklist.
 * Consulta MusicBrainz para obtener los créditos de cada track y los ingiere
 * en la base local. Marca el release con creditsSyncedAt al finalizar.
 */
export async function syncReleaseCredits(releaseRow: ReleaseRow): Promise<void> {
  if (!releaseRow.mbid) return;

  const full = await musicbrainz.getRelease(releaseRow.mbid);

  for (const medium of full.media ?? []) {
    for (const mbTrack of medium.tracks) {
      if (!mbTrack["artist-credit"]?.length) continue;

      // Buscar el recording correspondiente en la base local
      const [localRecording] = await db
        .select()
        .from(recording)
        .where(eq(recording.mbid, mbTrack.recording.id))
        .limit(1);

      if (!localRecording) continue;

      // Ingerir los créditos del track
      await ingestCredits(mbTrack["artist-credit"], { recordingId: localRecording.id });
    }
  }

  // Marcar el release como sincronizado
  await db
    .update(release)
    .set({ creditsSyncedAt: new Date() })
    .where(eq(release.id, releaseRow.id));
}
