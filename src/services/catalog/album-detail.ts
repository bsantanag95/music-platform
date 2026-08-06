import { eq, inArray, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  releaseGroup,
  track,
  recording,
  credit,
  artist,
  type ReleaseGroupRow,
  type ReleaseRow,
} from "@/db/schema";
import { findOrIngestTracklist } from "./ingest-release";
import { coverThumbUrl } from "../cover-art";

export interface AlbumCredit {
  artistId: string;
  name: string;
  role: "primary" | "featured";
  joinPhrase: string | null;
}

export interface AlbumTrack {
  recordingId: string;
  discNumber: number;
  position: number;
  title: string;
  durationSec: number | null;
  credits: AlbumCredit[];
}

export interface AlbumDetail {
  releaseGroup: ReleaseGroupRow;
  release: ReleaseRow;
  cover: string | null;
  tracks: AlbumTrack[];
}

export type AlbumDetailResult =
  | { kind: "not_found" }
  | { kind: "no_editions" }
  | { kind: "ok"; detail: AlbumDetail };

/**
 * Read-model compartido: resuelve el detalle completo de un álbum
 * (release group, edición seleccionada, carátula, tracklist y créditos).
 * Lo consumen tanto el Server Component como el endpoint REST.
 *
 * Distingue tres estados:
 * - `not_found`: el id no corresponde a ningún release_group.
 * - `no_editions`: el release_group existe pero no hay ediciones ingeribles.
 * - `ok`: detalle completo listo para renderizar.
 */
export async function getAlbumDetail(releaseGroupId: string): Promise<AlbumDetailResult> {
  const [rg] = await db
    .select()
    .from(releaseGroup)
    .where(eq(releaseGroup.id, releaseGroupId))
    .limit(1);

  if (!rg) return { kind: "not_found" };

  const releaseRow = await findOrIngestTracklist(rg.id, rg.mbid ?? "");
  if (!releaseRow) return { kind: "no_editions" };

  const tracks = await db
    .select({
      recordingId: track.recordingId,
      position: track.position,
      discNumber: track.discNumber,
      title: recording.title,
      durationSec: recording.durationSec,
    })
    .from(track)
    .innerJoin(recording, eq(track.recordingId, recording.id))
    .where(eq(track.releaseId, releaseRow.id))
    .orderBy(asc(track.discNumber), asc(track.position), asc(recording.id));

  const recordingIds = tracks.map((t) => t.recordingId);

  const creditRows = recordingIds.length
    ? await db
        .select({
          recordingId: credit.recordingId,
          artistId: artist.id,
          name: artist.name,
          role: credit.role,
          joinPhrase: credit.joinPhrase,
          position: credit.position,
        })
        .from(credit)
        .innerJoin(artist, eq(artist.id, credit.artistId))
        .where(inArray(credit.recordingId, recordingIds))
    : [];

  const creditsByRecording = new Map<string, typeof creditRows>();
  for (const c of creditRows) {
    if (!c.recordingId) continue;
    const existing = creditsByRecording.get(c.recordingId) ?? [];
    existing.push(c);
    creditsByRecording.set(c.recordingId, existing);
  }

  const albumTracks: AlbumTrack[] = tracks.map((t) => ({
    recordingId: t.recordingId,
    discNumber: t.discNumber,
    position: t.position,
    title: t.title,
    durationSec: t.durationSec,
    credits: (creditsByRecording.get(t.recordingId) ?? [])
      .sort((a, b) => a.position - b.position)
      .map(({ artistId, name, role, joinPhrase }) => ({
        artistId,
        name,
        role: role as "primary" | "featured",
        joinPhrase,
      })),
  }));

  return {
    kind: "ok",
    detail: {
      releaseGroup: rg,
      release: releaseRow,
      cover: releaseRow.mbid ? coverThumbUrl(releaseRow.mbid) : null,
      tracks: albumTracks,
    },
  };
}
