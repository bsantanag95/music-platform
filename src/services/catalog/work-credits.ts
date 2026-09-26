import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { recording, recordingWork, release, track, work, workCredit } from "@/db/schema";
import type { MBRelease } from "../musicbrainz/types";
import { upsertArtistStub } from "./ingest-artist";
import { mapRelation, type MappedPersonnelRelation } from "./credit-relations";

// Autoría de obras (openspec: add-songwriter-credits, capability `personnel-credits`): en
// MusicBrainz compositores y letristas cuelgan de la OBRA, no de la grabación, y la misma
// obra la comparten estudio, vivo y covers. Llegan en la MISMA request de edición que la
// tracklist (`work-rels+work-level-rels`): cada grabación trae su relación `performance`
// con la obra embebida y las relaciones de artista de esa obra.

export interface MappedWork {
  title: string;
  /** Relaciones de artista de la obra (autores); vacío si MusicBrainz no las cargó. */
  credits: MappedPersonnelRelation[];
}

export interface MappedRecordingWork {
  workMbid: string;
  /** Atributos del vínculo (`cover`, `live`, `instrumental`, …), ordenados. */
  attributes: string[];
}

function dedupe(relations: MappedPersonnelRelation[]): MappedPersonnelRelation[] {
  const seen = new Map<string, MappedPersonnelRelation>();
  for (const r of relations) seen.set(`${r.artistMbid}|${r.relationType}|${r.attributes.join(",")}`, r);
  return [...seen.values()];
}

/**
 * Obras de una edición y el vínculo de cada grabación con ellas. Solo relaciones de obra
 * con destino artista (las editoriales, con destino sello, se ignoran). Pura.
 */
export function mapWorkRelations(full: MBRelease): {
  works: Map<string, MappedWork>;
  byRecordingMbid: Map<string, MappedRecordingWork[]>;
} {
  const works = new Map<string, MappedWork>();
  const byRecordingMbid = new Map<string, MappedRecordingWork[]>();

  for (const medium of full.media ?? []) {
    for (const mbTrack of medium.tracks ?? []) {
      for (const relation of mbTrack.recording.relations ?? []) {
        if (relation["target-type"] !== "work" || !relation.work) continue;
        const mbWork = relation.work;
        const credits = (mbWork.relations ?? []).flatMap((r) => {
          const mapped = mapRelation(r);
          return mapped ? [mapped] : [];
        });
        const existing = works.get(mbWork.id);
        works.set(mbWork.id, {
          title: mbWork.title,
          credits: dedupe([...(existing?.credits ?? []), ...credits]),
        });

        const links = byRecordingMbid.get(mbTrack.recording.id) ?? [];
        if (!links.some((link) => link.workMbid === mbWork.id)) {
          links.push({ workMbid: mbWork.id, attributes: [...new Set(relation.attributes ?? [])].sort() });
        }
        byRecordingMbid.set(mbTrack.recording.id, links);
      }
    }
  }
  return { works, byRecordingMbid };
}

/** Cantidad de créditos de autoría de una respuesta (para el backfill en `--dry-run`). */
export function countWorkCredits(full: MBRelease): number {
  return [...mapWorkRelations(full).works.values()].reduce((n, w) => n + w.credits.length, 0);
}

/**
 * Reemplaza las obras de las grabaciones de una edición y sus autores con los de la
 * respuesta de MusicBrainz, en una transacción: un fallo a mitad conserva los anteriores.
 * Las obras se identifican por MBID (una sola fila aunque la compartan varias grabaciones).
 * Los artistas que no existen se crean como stub antes (idempotente). Marca
 * `works_synced_at` al terminar.
 */
export async function saveWorkCredits(releaseId: string, full: MBRelease): Promise<void> {
  const mapped = mapWorkRelations(full);
  const allCredits = [...mapped.works.values()].flatMap((w) => w.credits);

  const artistIdByMbid = new Map<string, string>();
  for (const credit of allCredits) {
    if (artistIdByMbid.has(credit.artistMbid)) continue;
    const row = await upsertArtistStub(credit.artistMbid, credit.artistName);
    artistIdByMbid.set(credit.artistMbid, row.id);
  }

  const recordingMbids = [...mapped.byRecordingMbid.keys()];
  const recordingRows = recordingMbids.length
    ? await db.select({ id: recording.id, mbid: recording.mbid }).from(recording).where(inArray(recording.mbid, recordingMbids))
    : [];
  const recordingIdByMbid = new Map(recordingRows.flatMap((row) => (row.mbid ? [[row.mbid, row.id] as const] : [])));

  // Grabaciones de ESTA edición: sus vínculos se reemplazan aunque MusicBrainz ya no traiga obra.
  const releaseRecordingIds = (
    await db.select({ recordingId: track.recordingId }).from(track).where(eq(track.releaseId, releaseId))
  ).map((row) => row.recordingId);

  await db.transaction(async (tx) => {
    const workIdByMbid = new Map<string, string>();
    for (const [mbid, mappedWork] of mapped.works) {
      const [row] = await tx
        .insert(work)
        .values({ mbid, title: mappedWork.title })
        .onConflictDoUpdate({ target: work.mbid, set: { title: mappedWork.title } })
        .returning({ id: work.id });
      workIdByMbid.set(mbid, row!.id);
    }

    if (releaseRecordingIds.length > 0) {
      await tx.delete(recordingWork).where(inArray(recordingWork.recordingId, releaseRecordingIds));
    }
    const links = [...mapped.byRecordingMbid].flatMap(([recordingMbid, recordingLinks]) => {
      const recordingId = recordingIdByMbid.get(recordingMbid);
      if (!recordingId) return [];
      return recordingLinks.map((link) => ({
        recordingId,
        workId: workIdByMbid.get(link.workMbid)!,
        attributes: link.attributes,
      }));
    });
    if (links.length > 0) await tx.insert(recordingWork).values(links).onConflictDoNothing();

    const workIds = [...workIdByMbid.values()];
    if (workIds.length > 0) await tx.delete(workCredit).where(inArray(workCredit.workId, workIds));
    const creditRows = [...mapped.works].flatMap(([mbid, mappedWork]) =>
      mappedWork.credits.map((credit) => ({
        workId: workIdByMbid.get(mbid)!,
        artistId: artistIdByMbid.get(credit.artistMbid)!,
        relationType: credit.relationType,
        attributes: credit.attributes,
        creditedAs: credit.creditedAs,
      })),
    );
    if (creditRows.length > 0) await tx.insert(workCredit).values(creditRows).onConflictDoNothing();

    await tx.update(release).set({ worksSyncedAt: new Date() }).where(eq(release.id, releaseId));
  });
}
