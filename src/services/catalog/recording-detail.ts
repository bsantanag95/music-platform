import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  artist,
  credit,
  recording,
  release,
  releaseGroup,
  track,
  type RecordingRow,
} from "@/db/schema";

export interface RecordingCredit {
  artistId: string;
  name: string;
  role: "primary" | "featured";
  joinPhrase: string | null;
}

export interface RecordingAppearance {
  releaseId: string;
  releaseGroupId: string;
  albumTitle: string;
  editionLabel: string;
  releaseDate: string | null;
  coverThumbUrl: string | null;
  discNumber: number;
  position: number;
}

export interface RecordingDetail {
  recording: RecordingRow;
  credits: RecordingCredit[];
  appearances: RecordingAppearance[];
}

export type RecordingDetailResult =
  | { kind: "not_found" }
  | { kind: "ok"; detail: RecordingDetail };

/** Read-model público de una grabación, completamente servido desde la base local. */
export async function getRecordingDetail(recordingId: string): Promise<RecordingDetailResult> {
  const [recordingRow] = await db
    .select()
    .from(recording)
    .where(eq(recording.id, recordingId))
    .limit(1);

  if (!recordingRow) return { kind: "not_found" };

  const [creditRows, appearanceRows] = await Promise.all([
    db
      .select({
        artistId: artist.id,
        name: artist.name,
        role: credit.role,
        joinPhrase: credit.joinPhrase,
        position: credit.position,
      })
      .from(credit)
      .innerJoin(artist, eq(artist.id, credit.artistId))
      .where(eq(credit.recordingId, recordingId))
      .orderBy(asc(credit.position)),
    db
      .select({
        releaseId: release.id,
        releaseGroupId: releaseGroup.id,
        albumTitle: releaseGroup.title,
        editionLabel: release.editionLabel,
        releaseDate: release.releaseDate,
        coverThumbUrl: releaseGroup.coverThumbUrl,
        discNumber: track.discNumber,
        position: track.position,
      })
      .from(track)
      .innerJoin(release, eq(release.id, track.releaseId))
      .innerJoin(releaseGroup, eq(releaseGroup.id, release.releaseGroupId))
      .where(eq(track.recordingId, recordingId))
      .orderBy(asc(releaseGroup.title), asc(track.discNumber), asc(track.position)),
  ]);

  return {
    kind: "ok",
    detail: {
      recording: recordingRow,
      credits: creditRows.map(({ artistId, name, role, joinPhrase }) => ({
        artistId,
        name,
        role: role as "primary" | "featured",
        joinPhrase,
      })),
      appearances: appearanceRows,
    },
  };
}
