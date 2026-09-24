import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { release, recording, track, releaseGroup, type ReleaseRow } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import { normalizeReleaseDate, yearFromMbDate } from "../musicbrainz/mappers";
import { ingestCredits } from "./ingest-discography";
import { pickRepresentativeRelease, deriveEditionLabel } from "./representative-release";
import { fetchReleaseEditions, saveReleaseEditions } from "./release-editions";
import { completePersonnelSync, savePersonnelCredits } from "./personnel-credits";
import type { MBReleaseSummary } from "../musicbrainz/types";

/**
 * Persiste la fecha de lanzamiento canónica del release-group
 * (openspec: canonicalize-release-group). Deriva `first_release_date` y
 * `first_release_year` de `first-release-date` de MusicBrainz —calculada
 * sobre TODAS las ediciones, no la ingerida— con la misma tolerancia a
 * precisión parcial que `release-date-precision`. No sobrescribe con nulo
 * un valor ya presente.
 */
export async function persistCanonicalReleaseDate(
  releaseGroupId: string,
  firstReleaseDate: string | undefined,
): Promise<void> {
  const date = normalizeReleaseDate(firstReleaseDate);
  const year = yearFromMbDate(firstReleaseDate);
  if (date === null && year === null) return;

  await db
    .update(releaseGroup)
    .set({
      ...(date !== null ? { firstReleaseDate: date } : {}),
      ...(year !== null ? { firstReleaseYear: year } : {}),
    })
    .where(eq(releaseGroup.id, releaseGroupId));
}

/**
 * Trae y cachea el tracklist de la **edición representativa** de un
 * release-group, elegida de forma determinista por `pickRepresentativeRelease`
 * (openspec: album-edition-selection) entre TODAS sus ediciones: el browse
 * paginado reemplaza al lookup del grupo, que devolvía como máximo 25
 * (openspec: enrich-album-editions-and-credits). La misma pasada guarda el
 * resumen de ediciones (sellos, formatos) y la fecha canónica del álbum.
 *
 * Nota: si la representativa ya existe se devuelve tal cual, sin llamadas a
 * MusicBrainz (una caída de MusicBrainz no debe romper la vista de álbum). Los
 * álbumes ingeridos antes del resumen de ediciones lo sincronizan en segundo
 * plano (`scheduleEditionsSync`); corregir una edición representativa subóptima
 * es tarea de `scripts/recanonicalize-release-group.ts`.
 */
export async function findOrIngestTracklist(
  releaseGroupId: string,
  releaseGroupMbid: string,
): Promise<ReleaseRow | null> {
  const [existing] = await db
    .select()
    .from(release)
    .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.isRepresentative, true)))
    .limit(1);

  if (existing) return existing;

  const { editions, firstReleaseDate } = await fetchReleaseEditions(releaseGroupMbid);
  await persistCanonicalReleaseDate(releaseGroupId, firstReleaseDate);
  await saveReleaseEditions(releaseGroupId, editions);

  const chosen = pickRepresentativeRelease(editions);
  if (!chosen) return null;

  return ingestReleaseTracklist(releaseGroupId, chosen, { representative: true });
}

/**
 * Ingiere la tracklist de UNA edición: `release`, grabaciones, `track` y créditos de
 * autoría de cada pista. `representative: true` la marca como la edición del álbum;
 * `false` la guarda como edición adicional (variantes con pistas adicionales, ingeridas
 * bajo demanda) sin tocar la representativa.
 */
export async function ingestReleaseTracklist(
  releaseGroupId: string,
  edition: MBReleaseSummary,
  { representative }: { representative: boolean },
): Promise<ReleaseRow> {
  const full = await musicbrainz.getRelease(edition.id);
  const releaseDate = normalizeReleaseDate(full.date);
  const editionLabel = deriveEditionLabel(edition);

  // La carátula ya no se resuelve acá: vive en `release_group.cover_thumb_url`
  // (patrón cover-only, ver services/catalog/cover.ts) y `release.cover_thumb_url`
  // quedó deprecada. El read-model la lee de release_group.
  const insertedReleases = await db
    .insert(release)
    .values({
      mbid: full.id,
      releaseGroupId,
      editionLabel,
      releaseDate,
      creditsSyncedAt: new Date(),
      isRepresentative: representative,
    })
    .onConflictDoUpdate({
      target: release.mbid,
      set: { releaseDate, editionLabel, ...(representative ? { isRepresentative: true } : {}) },
    })
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

  // Créditos de personal: vienen en la misma respuesta (`getRelease` pide las relaciones).
  await savePersonnelCredits(releaseRow.id, full);
  await completePersonnelSync(releaseRow.id, releaseGroupId);

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
