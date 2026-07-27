import { eq } from "drizzle-orm";
import { db } from "@/db";
import { release, recording, track, type ReleaseRow } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import { ingestCredits } from "./ingest-discography";

/**
 * Trae y cachea el tracklist de la edición "oficial" de un release-group
 * (o la primera disponible si no hay ninguna marcada como oficial).
 * Simplificación de la Fase 2: se ingiere una sola edición por álbum;
 * ingerir ediciones alternativas (japonesa, remaster) queda para cuando
 * el modelo de selección de edición se implemente en el frontend.
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

  const insertedReleases = await db
    .insert(release)
    .values({
      mbid: full.id,
      releaseGroupId,
      editionLabel: "original",
      releaseDate: full.date ?? null,
    })
    .onConflictDoUpdate({ target: release.mbid, set: { releaseDate: full.date ?? null } })
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
