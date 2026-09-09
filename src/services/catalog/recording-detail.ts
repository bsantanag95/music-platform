import { and, asc, eq } from "drizzle-orm";
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

export interface ContainingAlbum {
  releaseGroupId: string;
  title: string;
  category: string;
  coverThumbUrl: string | null;
  firstReleaseYear: number | null;
}

export interface RecordingDetail {
  recording: RecordingRow;
  credits: RecordingCredit[];
  /** Release-groups distintos que contienen la canción, del más temprano al más tardío. */
  containingAlbums: ContainingAlbum[];
  appearances: RecordingAppearance[];
  primaryArtist: { id: string; name: string } | null;
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

  const [creditRows, appearanceRows, containingAlbumRows] = await Promise.all([
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
    db
      .selectDistinct({
        releaseGroupId: releaseGroup.id,
        title: releaseGroup.title,
        category: releaseGroup.category,
        coverThumbUrl: releaseGroup.coverThumbUrl,
        firstReleaseDate: releaseGroup.firstReleaseDate,
        firstReleaseYear: releaseGroup.firstReleaseYear,
      })
      .from(track)
      .innerJoin(release, eq(release.id, track.releaseId))
      .innerJoin(releaseGroup, eq(releaseGroup.id, release.releaseGroupId))
      .where(eq(track.recordingId, recordingId)),
  ]);

  // Álbumes contenedores ordenados por primer lanzamiento (nulls al final).
  const containingAlbums = [...containingAlbumRows]
    .sort((a, b) => {
      const ka = a.firstReleaseDate ?? `${String(a.firstReleaseYear ?? 9999).padStart(4, "0")}-99-99`;
      const kb = b.firstReleaseDate ?? `${String(b.firstReleaseYear ?? 9999).padStart(4, "0")}-99-99`;
      return ka.localeCompare(kb) || a.releaseGroupId.localeCompare(b.releaseGroupId);
    })
    .map(({ releaseGroupId, title, category, coverThumbUrl, firstReleaseYear }) => ({
      releaseGroupId,
      title,
      category,
      coverThumbUrl,
      firstReleaseYear,
    }));

  const [primaryArtist] = appearanceRows[0]
    ? await db
        .select({ id: artist.id, name: artist.name })
        .from(credit)
        .innerJoin(artist, eq(artist.id, credit.artistId))
        .where(
          and(
            eq(credit.releaseGroupId, appearanceRows[0].releaseGroupId),
            eq(credit.role, "primary"),
          ),
        )
        .orderBy(asc(credit.position))
        .limit(1)
    : [];

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
      containingAlbums,
      appearances: appearanceRows,
      primaryArtist: primaryArtist ? { id: primaryArtist.id, name: primaryArtist.name } : null,
    },
  };
}
