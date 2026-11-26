import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { artist, credit, personnelCredit, recording, release, track } from "@/db/schema";
import { musicbrainz } from "../musicbrainz/client";
import type { MBRelease } from "../musicbrainz/types";
import { mapRelation, type MappedPersonnelRelation } from "./credit-relations";
import { ensureArtistMemberships, upsertArtistStub } from "./ingest-artist";
import { countWorkCredits, saveWorkCredits } from "./work-credits";
import { inTransaction, singleFlight, withEntityLock, type Tx } from "@/db/entity-sync";

export type { MappedPersonnelRelation } from "./credit-relations";

// Créditos de personal (openspec: enrich-album-editions-and-credits, capability
// `personnel-credits`): las relaciones de artista de MusicBrainz sobre una edición (arte,
// diseño) y sobre cada grabación (instrumento, voz, producción, ingeniería, mezcla). Llegan
// en la MISMA request que la tracklist (`getRelease`). Se guardan todos los tipos; la
// clasificación en niveles es de lectura (`personnel-levels.ts`).

function dedupe(relations: MappedPersonnelRelation[]): MappedPersonnelRelation[] {
  const seen = new Map<string, MappedPersonnelRelation>();
  for (const r of relations) seen.set(`${r.artistMbid}|${r.relationType}|${r.attributes.join(",")}`, r);
  return [...seen.values()];
}

/** Relaciones de artista de una edición: las de nivel edición y las de cada grabación. Pura. */
export function mapPersonnelRelations(full: MBRelease): {
  release: MappedPersonnelRelation[];
  byRecordingMbid: Map<string, MappedPersonnelRelation[]>;
} {
  const releaseRelations = dedupe(
    (full.relations ?? []).flatMap((r) => {
      const mapped = mapRelation(r);
      return mapped ? [mapped] : [];
    }),
  );
  const byRecordingMbid = new Map<string, MappedPersonnelRelation[]>();
  for (const medium of full.media ?? []) {
    for (const mbTrack of medium.tracks ?? []) {
      const mapped = (mbTrack.recording.relations ?? []).flatMap((r) => {
        const m = mapRelation(r);
        return m ? [m] : [];
      });
      if (mapped.length === 0) continue;
      const existing = byRecordingMbid.get(mbTrack.recording.id) ?? [];
      byRecordingMbid.set(mbTrack.recording.id, dedupe([...existing, ...mapped]));
    }
  }
  return { release: releaseRelations, byRecordingMbid };
}

/**
 * Reemplaza los créditos de personal de una edición y de sus grabaciones con los de la
 * respuesta de MusicBrainz, en una transacción: un fallo a mitad conserva los anteriores.
 * Los artistas que no existen se crean como stub (antes de la transacción: es idempotente).
 * Con `tx`, todo va por esa transacción (ADR 0063).
 */
export async function savePersonnelCredits(releaseId: string, full: MBRelease, tx?: Tx): Promise<void> {
  const executor = tx ?? db;
  const mapped = mapPersonnelRelations(full);
  const recordingMbids = [...mapped.byRecordingMbid.keys()];
  const allRelations = [...mapped.release, ...[...mapped.byRecordingMbid.values()].flat()];

  const artistIdByMbid = new Map<string, string>();
  for (const r of allRelations) {
    if (artistIdByMbid.has(r.artistMbid)) continue;
    const row = await upsertArtistStub(r.artistMbid, r.artistName, executor);
    artistIdByMbid.set(r.artistMbid, row.id);
  }

  const recordingRows = recordingMbids.length
    ? await executor
        .select({ id: recording.id, mbid: recording.mbid })
        .from(recording)
        .where(inArray(recording.mbid, recordingMbids))
    : [];
  const recordingIdByMbid = new Map(recordingRows.flatMap((row) => (row.mbid ? [[row.mbid, row.id] as const] : [])));

  const rows = [
    ...mapped.release.map((r) => ({ ...toRow(r, artistIdByMbid), releaseId, recordingId: null })),
    ...[...mapped.byRecordingMbid].flatMap(([recordingMbid, relations]) => {
      const recordingId = recordingIdByMbid.get(recordingMbid);
      if (!recordingId) return [];
      return relations.map((r) => ({ ...toRow(r, artistIdByMbid), releaseId: null, recordingId }));
    }),
  ];

  // Grabaciones de ESTA edición: sus créditos se reemplazan aunque MusicBrainz ya no traiga ninguno.
  const releaseRecordingIds = (
    await executor.select({ recordingId: track.recordingId }).from(track).where(eq(track.releaseId, releaseId))
  ).map((row) => row.recordingId);

  await inTransaction(tx, async (inner) => {
    await inner
      .delete(personnelCredit)
      .where(
        releaseRecordingIds.length
          ? or(eq(personnelCredit.releaseId, releaseId), inArray(personnelCredit.recordingId, releaseRecordingIds))
          : eq(personnelCredit.releaseId, releaseId),
      );
    if (rows.length > 0) await inner.insert(personnelCredit).values(rows).onConflictDoNothing();
  });
}

function toRow(r: MappedPersonnelRelation, artistIdByMbid: Map<string, string>) {
  return {
    artistId: artistIdByMbid.get(r.artistMbid)!,
    relationType: r.relationType,
    attributes: r.attributes,
    creditedAs: r.creditedAs,
  };
}

/**
 * Asegura las pertenencias (`membership`) de los artistas principales del álbum: sin ellas,
 * un integrante se clasificaría como invitado. Solo pide a MusicBrainz las que faltan.
 */
export async function ensureAlbumArtistMemberships(releaseGroupId: string): Promise<void> {
  const artists = await db
    .select()
    .from(artist)
    .innerJoin(credit, eq(credit.artistId, artist.id))
    .where(
      and(
        eq(credit.releaseGroupId, releaseGroupId),
        eq(credit.role, "primary"),
        isNull(credit.recordingId),
        isNull(artist.membershipsSyncedAt),
      ),
    );
  for (const row of artists) await ensureArtistMemberships(row.artist);
}

/**
 * Tras guardar los créditos de personal de una edición: asegura las pertenencias y recién
 * entonces marca la edición como sincronizada. Si MusicBrainz falla en las pertenencias,
 * los créditos quedan guardados y la edición pendiente (se completa en segundo plano).
 */
export async function completePersonnelSync(releaseId: string, releaseGroupId: string): Promise<boolean> {
  try {
    await ensureAlbumArtistMemberships(releaseGroupId);
  } catch (error) {
    console.error(`[personnel-credits] no se pudieron sincronizar las pertenencias de ${releaseGroupId}`, error);
    return false;
  }
  await db.update(release).set({ personnelSyncedAt: new Date() }).where(eq(release.id, releaseId));
  return true;
}

export type PersonnelSyncResult =
  | { status: "skipped" }
  | { status: "synced"; creditCount: number; workCreditCount: number };

/**
 * Sincroniza los créditos de personal y la autoría de obras de la edición representativa de
 * un álbum ingerido antes de alguno de los dos (`personnel_synced_at` o `works_synced_at`
 * nulo; openspec: add-songwriter-credits). Una request a MusicBrainz trae ambos; se reemplaza
 * todo (idempotente). La request sale fuera de toda transacción y la escritura va en una
 * transacción corta con el candado por edición, que relee las marcas (ADR 0063): dos visitas
 * simultáneas del proceso comparten la ejecución y, entre procesos, la que llega tarde no escribe.
 * Las pertenencias de los artistas principales se aseguran después de escribir, fuera de la
 * transacción (van a MusicBrainz), y recién entonces se marca `personnel_synced_at`.
 */
export function syncPersonnelCredits(
  releaseGroupId: string,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<PersonnelSyncResult> {
  return singleFlight(`personnel:${releaseGroupId}:${dryRun}`, () => runPersonnelSync(releaseGroupId, dryRun));
}

async function runPersonnelSync(releaseGroupId: string, dryRun: boolean): Promise<PersonnelSyncResult> {
  const [current] = await db
    .select()
    .from(release)
    .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.isRepresentative, true)))
    .limit(1);
  if (!current?.mbid || (current.personnelSyncedAt && current.worksSyncedAt)) return { status: "skipped" };
  const mbid = current.mbid;

  const full = await musicbrainz.getRelease(mbid);
  const mapped = mapPersonnelRelations(full);
  const creditCount = mapped.release.length + [...mapped.byRecordingMbid.values()].reduce((n, r) => n + r.length, 0);
  const workCreditCount = countWorkCredits(full);
  if (dryRun) return { status: "synced", creditCount, workCreditCount };

  const written = await withEntityLock(`personnel:${current.id}`, async (tx) => {
    const [locked] = await tx.select().from(release).where(eq(release.id, current.id)).limit(1);
    if (!locked || locked.mbid !== mbid || (locked.personnelSyncedAt && locked.worksSyncedAt)) return false;
    await savePersonnelCredits(locked.id, full, tx);
    await saveWorkCredits(locked.id, full, tx);
    return true;
  });
  if (!written) return { status: "skipped" };

  await completePersonnelSync(current.id, releaseGroupId);
  return { status: "synced", creditCount, workCreditCount };
}
