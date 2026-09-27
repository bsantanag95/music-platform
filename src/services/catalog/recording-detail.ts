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
  type ReleaseRow,
} from "@/db/schema";
import { schedulePersonnelSync } from "./album-detail";
import {
  compareDiscsByDate,
  discDateKey,
  loadVersionAttributes,
  pickPrincipalDisc,
} from "./recording-versions";

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
  firstReleaseDate: string | null;
  firstReleaseYear: number | null;
}

export interface RecordingDetail {
  recording: RecordingRow;
  credits: RecordingCredit[];
  /** Release-groups distintos que contienen la canción, del más temprano al más tardío. */
  containingAlbums: ContainingAlbum[];
  appearances: RecordingAppearance[];
  primaryArtist: { id: string; name: string } | null;
  /** Atributos del vínculo con la obra (openspec: redesign-song-page, `song-versions`). */
  versionAttributes: string[];
  /** Primer disco de estudio que la contiene, si no el más temprano (`song-page-layout`). */
  principalDisc: ContainingAlbum | null;
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

  const [creditRows, appearanceRows, containingAlbumRows, versionAttributes] = await Promise.all([
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
    loadVersionAttributes([recordingId]),
  ]);

  // Álbumes contenedores ordenados por primer lanzamiento (nulls al final).
  const containingAlbums: ContainingAlbum[] = [...containingAlbumRows].sort(compareDiscsByDate);
  const principalDisc = pickPrincipalDisc(containingAlbums);

  // Artista para las migas: el principal del disco principal (o del primero que aparezca).
  const breadcrumbAlbumId = principalDisc?.releaseGroupId ?? appearanceRows[0]?.releaseGroupId;
  const [primaryArtist] = breadcrumbAlbumId
    ? await db
        .select({ id: artist.id, name: artist.name })
        .from(credit)
        .innerJoin(artist, eq(artist.id, credit.artistId))
        .where(and(eq(credit.releaseGroupId, breadcrumbAlbumId), eq(credit.role, "primary")))
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
      versionAttributes: versionAttributes.get(recordingId) ?? [],
      principalDisc,
    },
  };
}

// ---------------------------------------------------------------------------
// "Esta grabación aparece en" (openspec: redesign-song-page, `song-versions`).
// ---------------------------------------------------------------------------

export const APPEARANCE_CATEGORY_ORDER = ["studio", "single_ep", "compilation", "live_other"] as const;
export type AppearanceCategory = (typeof APPEARANCE_CATEGORY_ORDER)[number];

/** Discos visibles por grupo antes del "+N". */
export const APPEARANCES_VISIBLE_PER_GROUP = 3;

export interface AppearanceGroup {
  category: AppearanceCategory;
  discs: ContainingAlbum[];
}

export interface GroupedAppearances {
  groups: AppearanceGroup[];
  /** El disco más temprano de todos: lleva la marca "original". */
  originalReleaseGroupId: string | null;
}

/**
 * Agrupa los discos por tipo en orden fijo, cada grupo del más temprano al más tardío; los
 * grupos vacíos no aparecen. Una categoría desconocida cae en "en vivo y otros". Pura.
 */
export function groupAppearances(discs: ContainingAlbum[]): GroupedAppearances {
  const byCategory = new Map<AppearanceCategory, ContainingAlbum[]>();
  for (const disc of discs) {
    const category = (APPEARANCE_CATEGORY_ORDER as readonly string[]).includes(disc.category)
      ? (disc.category as AppearanceCategory)
      : "live_other";
    byCategory.set(category, [...(byCategory.get(category) ?? []), disc]);
  }
  const groups = APPEARANCE_CATEGORY_ORDER.flatMap((category) => {
    const group = byCategory.get(category);
    return group ? [{ category, discs: [...group].sort(compareDiscsByDate) }] : [];
  });
  const earliest = [...discs].sort(compareDiscsByDate)[0];
  return { groups, originalReleaseGroupId: earliest?.releaseGroupId ?? null };
}

/** Año del disco para mostrar (el año canónico, o el de la fecha si solo hay fecha). */
export function discYear(disc: Pick<ContainingAlbum, "firstReleaseDate" | "firstReleaseYear">): number | null {
  if (disc.firstReleaseYear !== null) return disc.firstReleaseYear;
  const year = Number(discDateKey(disc).slice(0, 4));
  return year === 9999 ? null : year;
}

// ---------------------------------------------------------------------------
// Tira de pistas (openspec: redesign-song-page, `song-page-layout`, design D5).
// ---------------------------------------------------------------------------

export interface StripTrack {
  recordingId: string;
  discNumber: number;
  position: number;
  title: string;
}

export interface TrackStrip {
  current: StripTrack;
  /** Posición 1-based en el orden global del álbum y total de pistas. */
  index: number;
  total: number;
  /** El álbum tiene más de un disco: la numeración visible es `disco-pista`. */
  multiDisc: boolean;
  previous: StripTrack | null;
  next: StripTrack | null;
}

/**
 * Ubica la grabación en la lista (ya ordenada por disco y posición) y toma la anterior y la
 * siguiente cruzando discos. `null` si la grabación no está en la lista. Pura.
 */
export function buildTrackStrip(tracks: StripTrack[], recordingId: string): TrackStrip | null {
  const index = tracks.findIndex((t) => t.recordingId === recordingId);
  if (index === -1) return null;
  return {
    current: tracks[index]!,
    index: index + 1,
    total: tracks.length,
    multiDisc: new Set(tracks.map((t) => t.discNumber)).size > 1,
    previous: tracks[index - 1] ?? null,
    next: tracks[index + 1] ?? null,
  };
}

/** Edición representativa ingerida de un disco, o `null` si todavía no tiene tracklist. */
export async function loadRepresentativeRelease(releaseGroupId: string): Promise<ReleaseRow | null> {
  const [row] = await db
    .select()
    .from(release)
    .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.isRepresentative, true)))
    .limit(1);
  return row ?? null;
}

/** Tira de pistas de la grabación en la edición representativa de su disco principal. */
export async function getTrackStrip(recordingId: string, representativeReleaseId: string): Promise<TrackStrip | null> {
  const tracks = await db
    .select({
      recordingId: track.recordingId,
      discNumber: track.discNumber,
      position: track.position,
      title: recording.title,
    })
    .from(track)
    .innerJoin(recording, eq(recording.id, track.recordingId))
    .where(eq(track.releaseId, representativeReleaseId))
    .orderBy(asc(track.discNumber), asc(track.position), asc(recording.id));
  return buildTrackStrip(tracks, recordingId);
}

/**
 * Créditos y autoría se ingieren por disco. Si alguien llega a la canción sin pasar por el
 * álbum, se programan en segundo plano para la edición representativa del disco principal
 * (design D7), con la misma función y los mismos locks que la página de álbum.
 */
export function scheduleSongCreditsSync(representativeRelease: ReleaseRow | null): void {
  if (representativeRelease) schedulePersonnelSync(representativeRelease);
}
