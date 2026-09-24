import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { label, recording, release, releaseEdition, releaseEditionLabel, releaseGroup, track } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { ingestReleaseTracklist } from "./ingest-release";
import {
  detectEditionVariants,
  extraTracks,
  isBoxEdition,
  type EditionForVariants,
  type EditionVariant,
} from "./edition-variants";

// Lecturas de ediciones de un álbum (openspec: enrich-album-editions-and-credits): el
// resumen para la pestaña Ediciones, las variantes con pistas adicionales y la lista de
// una variante, que se ingiere la primera vez que alguien la pide.

export interface AlbumEditionLabel {
  name: string | null;
  catalogNumber: string | null;
}

export interface AlbumEdition extends Omit<EditionForVariants, "labels"> {
  labels: AlbumEditionLabel[];
}

export interface AlbumEditions {
  editions: AlbumEdition[];
  representativeMbid: string | null;
  representativeTrackCount: number;
  variants: EditionVariant[];
}

async function representativeTracks(releaseGroupId: string) {
  return db
    .select({
      recordingId: track.recordingId,
      title: recording.title,
      releaseMbid: release.mbid,
    })
    .from(track)
    .innerJoin(release, eq(release.id, track.releaseId))
    .innerJoin(recording, eq(recording.id, track.recordingId))
    .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.isRepresentative, true)));
}

/** Resumen de ediciones de un álbum con sus sellos, la representativa y las variantes. */
export async function getAlbumEditions(releaseGroupId: string): Promise<AlbumEditions> {
  const [rg] = await db
    .select({ title: releaseGroup.title })
    .from(releaseGroup)
    .where(eq(releaseGroup.id, releaseGroupId))
    .limit(1);
  if (!rg) return { editions: [], representativeMbid: null, representativeTrackCount: 0, variants: [] };

  const [editionRows, labelRows, mainTracks] = await Promise.all([
    db.select().from(releaseEdition).where(eq(releaseEdition.releaseGroupId, releaseGroupId)),
    db
      .select({
        releaseEditionId: releaseEditionLabel.releaseEditionId,
        name: label.name,
        catalogNumber: releaseEditionLabel.catalogNumber,
      })
      .from(releaseEditionLabel)
      .innerJoin(releaseEdition, eq(releaseEdition.id, releaseEditionLabel.releaseEditionId))
      .leftJoin(label, eq(label.id, releaseEditionLabel.labelId))
      .where(eq(releaseEdition.releaseGroupId, releaseGroupId))
      .orderBy(asc(releaseEditionLabel.position)),
    representativeTracks(releaseGroupId),
  ]);

  const labelsByEdition = new Map<string, AlbumEditionLabel[]>();
  for (const row of labelRows) {
    const list = labelsByEdition.get(row.releaseEditionId) ?? [];
    list.push({ name: row.name, catalogNumber: row.catalogNumber });
    labelsByEdition.set(row.releaseEditionId, list);
  }

  const editions: AlbumEdition[] = editionRows
    .map((row) => ({
      id: row.id,
      mbid: row.mbid,
      title: row.title,
      disambiguation: row.disambiguation,
      status: row.status,
      releaseDate: row.releaseDate,
      releaseYear: row.releaseYear,
      country: row.country,
      packaging: row.packaging,
      formats: row.formats,
      mediumCount: row.mediumCount,
      trackCount: row.trackCount,
      labels: labelsByEdition.get(row.id) ?? [],
    }))
    .sort(
      (a, b) =>
        (a.releaseDate ?? `${a.releaseYear ?? 9999}`).localeCompare(b.releaseDate ?? `${b.releaseYear ?? 9999}`) ||
        a.mbid.localeCompare(b.mbid),
    );

  const representativeTrackCount = mainTracks.length;
  const variants = detectEditionVariants(
    editions.map((e) => ({ ...e, labels: e.labels.flatMap((l) => (l.name ? [l.name] : [])) })),
    representativeTrackCount,
    rg.title,
  );

  return {
    editions,
    representativeMbid: mainTracks[0]?.releaseMbid ?? null,
    representativeTrackCount,
    variants,
  };
}

export interface ExtraTrack {
  recordingId: string;
  discNumber: number;
  position: number;
  title: string;
  durationSec: number | null;
  variantType: string;
}

/**
 * Pistas que una edición agrega a la lista de la representativa. Si la edición no tiene
 * tracklist ingerida, la ingiere como edición NO representativa (una request a
 * MusicBrainz la primera vez; después se lee de la base). Una caja no se ingiere.
 */
export async function getEditionExtraTracks(releaseGroupId: string, editionId: string): Promise<ExtraTrack[]> {
  const [edition] = await db
    .select()
    .from(releaseEdition)
    .where(and(eq(releaseEdition.id, editionId), eq(releaseEdition.releaseGroupId, releaseGroupId)))
    .limit(1);
  if (!edition) throw new ApiError("EDITION_NOT_FOUND", 404, "La edición no existe o no pertenece a este álbum");

  const mainTracks = await representativeTracks(releaseGroupId);
  if (isBoxEdition(edition, mainTracks.length)) {
    throw new ApiError("EDITION_IS_BOX", 422, "Las cajas no muestran su lista de pistas");
  }

  let [editionRelease] = await db
    .select({ id: release.id })
    .from(release)
    .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.mbid, edition.mbid)))
    .limit(1);
  if (!editionRelease) {
    const ingested = await ingestReleaseTracklist(
      releaseGroupId,
      {
        id: edition.mbid,
        title: edition.title,
        status: edition.status ?? undefined,
        date: edition.releaseDate ?? undefined,
        disambiguation: edition.disambiguation ?? undefined,
      },
      { representative: false },
    );
    editionRelease = { id: ingested.id };
  }

  const variantTracks = await db
    .select({
      recordingId: track.recordingId,
      discNumber: track.discNumber,
      position: track.position,
      title: recording.title,
      durationSec: recording.durationSec,
      variantType: recording.variantType,
    })
    .from(track)
    .innerJoin(recording, eq(recording.id, track.recordingId))
    .where(eq(track.releaseId, editionRelease.id))
    .orderBy(asc(track.discNumber), asc(track.position), asc(recording.id));

  return extraTracks(variantTracks, mainTracks);
}
