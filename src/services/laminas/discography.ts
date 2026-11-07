// Lámina de discografía (openspec: add-discography-lamina-phase1 y phase2, docs/05-features/sharing.md §4.1, ADR 0053): lo que
// una persona valoró de la discografía de un artista, por disco y por canción. Es derivada: se calcula en cada lectura y no tiene
// editor. `rating` no tiene audiencia, así que la ven el dueño y sus seguidores; a cualquier otro visitante se la abre solo la
// marca de `discography_share`, y esa marca no vuelve públicas las valoraciones en otro lugar. Qué secciones suma y qué vista
// muestra por defecto lo elige el dueño (`discography_preference`); la imagen compartida muestra lo mismo.

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, credit, discographyPreference, discographyShare, rating, releaseGroup, userList } from "@/db/schema";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import {
  DISCOGRAPHY_ALBUM_MIN_SONGS,
  DISCOGRAPHY_EXTRA_SECTIONS,
  DISCOGRAPHY_MIN_DISCS,
  discographyValue,
  effectiveView,
  songViewAvailable,
  type DiscographyExtraSection,
  type DiscographyView,
} from "@/lib/laminas/discography";
import { isValidUuid } from "@/lib/validation";
import { compareByYear } from "@/services/catalog/artist-discography-view";
import { discographySection, type DiscographySection } from "@/services/catalog/discography-sections";
import { readArtistDiscography, type DiscographyRow } from "@/services/catalog/ingest-discography";
import { countsByListId } from "@/services/journeys/progress";
import { ifVisible } from "@/services/share/targets/shared";
import { getProfileByUsername } from "@/services/social/profiles";
import { audiencesForProfile } from "@/services/social/visibility";

const ENTRY_LIMIT = 12;

export interface DiscographyScore {
  stars: number;
  detailedScore: number | null;
}

/** Disco con su nota: lo que usa la vista Por disco. */
export interface DiscographyDisc extends DiscographyScore {
  id: string;
  title: string;
  year: number | null;
  coverThumbUrl: string | null;
}

export interface DiscographyTrack {
  /** Número correlativo en la edición representativa, contando todos sus medios. */
  number: number;
  recordingId: string;
  title: string;
  score: DiscographyScore | null;
}

/** Disco con alguna valoración, del disco o de sus canciones: lo que usa la vista Por canción. */
export interface DiscographySongDisc {
  id: string;
  title: string;
  year: number | null;
  coverThumbUrl: string | null;
  score: DiscographyScore | null;
  tracks: DiscographyTrack[];
}

export interface DiscographyPreference {
  sections: DiscographyExtraSection[];
  view: DiscographyView;
}

/**
 * Progreso discreto (§6.4.1 de la filosofía de producto: nunca "X de Y" fuera de la página de gestión). De un Recorrido sale solo
 * su avance en porcentaje, para la barra; sin Recorrido, cuántos discos valoró, sin total. Los conteos de escuchas no salen de aquí.
 */
export type DiscographyProgress = { kind: "journey"; percent: number } | { kind: "rated"; count: number };

export interface DiscographyLamina {
  owner: { id: string; username: string; displayName: string | null };
  artist: { id: string; name: string };
  discs: DiscographyDisc[];
  songDiscs: DiscographySongDisc[];
  available: Record<DiscographyView, boolean>;
  preference: DiscographyPreference;
  /** La vista del dueño, o la otra si la suya no está disponible. */
  view: DiscographyView;
  progress: DiscographyProgress;
  /** Cuántos discos valorados faltan para la vista Por disco; 0 si ya existe. */
  missing: number;
  isOwner: boolean;
  shared: boolean;
}

const DEFAULT_PREFERENCE: DiscographyPreference = { sections: [], view: "disc" };

function sectionOf(row: Pick<DiscographyRow, "primaryType" | "secondaryTypes" | "category" | "creditRole">): DiscographySection {
  const { primaryType, secondaryTypes, creditRole } = row;
  return discographySection({ primaryType, secondaryTypes, creditRole, category: row.category as ReleaseGroupCategory });
}

function isMainDisc(row: Pick<DiscographyRow, "primaryType" | "secondaryTypes" | "category" | "creditRole">): boolean {
  return sectionOf(row) === "main";
}

export async function readDiscographyPreference(ownerId: string, artistId: string): Promise<DiscographyPreference> {
  const [row] = await db
    .select({ sections: discographyPreference.sections, view: discographyPreference.defaultView })
    .from(discographyPreference)
    .where(and(eq(discographyPreference.userId, ownerId), eq(discographyPreference.artistId, artistId)))
    .limit(1);
  if (!row) return DEFAULT_PREFERENCE;
  return {
    sections: DISCOGRAPHY_EXTRA_SECTIONS.filter((section) => row.sections.includes(section)),
    view: row.view === "song" ? "song" : "disc",
  };
}

export async function saveDiscographyPreference(ownerId: string, artistId: string, preference: DiscographyPreference): Promise<DiscographyPreference> {
  const sections = DISCOGRAPHY_EXTRA_SECTIONS.filter((section) => preference.sections.includes(section));
  await db
    .insert(discographyPreference)
    .values({ userId: ownerId, artistId, sections, defaultView: preference.view })
    .onConflictDoUpdate({
      target: [discographyPreference.userId, discographyPreference.artistId],
      set: { sections, defaultView: preference.view },
    });
  return { sections, view: preference.view };
}

type TrackRow = {
  release_group_id: string;
  disc_number: number;
  position: number;
  recording_id: string;
  title: string;
  stars: string | null;
  detailed_score: number | null;
};

/** Pistas de la edición representativa de cada disco, con la nota del dueño, en una sola consulta. */
async function readTracks(ownerId: string, discIds: string[]): Promise<Map<string, DiscographyTrack[]>> {
  const byDisc = new Map<string, DiscographyTrack[]>();
  if (discIds.length === 0) return byDisc;
  const rows = await db.execute<TrackRow>(sql`
    SELECT rel.release_group_id, t.disc_number, t.position, t.recording_id, rec.title, r.stars, r.detailed_score
    FROM release rel
    JOIN track t ON t.release_id = rel.id
    JOIN recording rec ON rec.id = t.recording_id
    LEFT JOIN rating r ON r.recording_id = t.recording_id AND r.user_id = ${ownerId}::uuid
    WHERE rel.is_representative AND rel.release_group_id IN (${sql.join(
      discIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    )})
    ORDER BY rel.release_group_id, t.disc_number, t.position`);
  for (const row of rows) {
    const tracks = byDisc.get(row.release_group_id) ?? [];
    tracks.push({
      number: tracks.length + 1,
      recordingId: row.recording_id,
      title: row.title,
      score: row.stars === null ? null : { stars: Number(row.stars), detailedScore: row.detailed_score },
    });
    byDisc.set(row.release_group_id, tracks);
  }
  return byDisc;
}

/** Discos de las secciones elegidas, con la nota del disco y las de sus canciones. */
async function readDiscs(ownerId: string, artistId: string, sections: readonly DiscographyExtraSection[]) {
  const shown = new Set<DiscographySection>(["main", ...sections]);
  const rows = (await readArtistDiscography(artistId)).filter((row) => shown.has(sectionOf(row)));
  if (rows.length === 0) return { discs: [], songDiscs: [] };
  const ids = rows.map((row) => row.id);
  const [ratings, tracks] = await Promise.all([
    db
      .select({ id: rating.releaseGroupId, stars: rating.stars, detailedScore: rating.detailedScore })
      .from(rating)
      .where(and(eq(rating.userId, ownerId), inArray(rating.releaseGroupId, ids))),
    readTracks(ownerId, ids),
  ]);
  const scores = new Map(ratings.map((row) => [row.id, { stars: Number(row.stars), detailedScore: row.detailedScore }]));

  const songDiscs: DiscographySongDisc[] = rows
    .flatMap((row) => {
      const score = scores.get(row.id) ?? null;
      const discTracks = tracks.get(row.id) ?? [];
      if (!score && !discTracks.some((track) => track.score)) return [];
      return [{ id: row.id, title: row.title, year: row.firstReleaseYear, coverThumbUrl: row.coverThumbUrl, score, tracks: discTracks }];
    })
    .sort(compareByYear);
  const discs: DiscographyDisc[] = songDiscs.flatMap((disc) =>
    disc.score ? [{ id: disc.id, title: disc.title, year: disc.year, coverThumbUrl: disc.coverThumbUrl, ...disc.score }] : [],
  );
  return { discs, songDiscs };
}

async function readProgress(ownerId: string, artistId: string, ratedCount: number): Promise<DiscographyProgress> {
  const [journey] = await db
    .select({ id: userList.id })
    .from(userList)
    .where(
      and(
        eq(userList.ownerId, ownerId),
        eq(userList.kind, "artist_journey"),
        eq(userList.journeyArtistId, artistId),
        isNull(userList.journeyArchivedAt),
      ),
    )
    .limit(1);
  const counts = journey ? (await countsByListId(ownerId, [journey.id])).get(journey.id) : undefined;
  if (!counts || counts.selected === 0) return { kind: "rated", count: ratedCount };
  return { kind: "journey", percent: Math.round((counts.listened / counts.selected) * 100) };
}

/** Discos, vistas y progreso, sin decidir quién mira. */
async function readDiscography(ownerId: string, artistId: string) {
  const [row] = await db.select({ id: artist.id, name: artist.name }).from(artist).where(eq(artist.id, artistId)).limit(1);
  if (!row) return null;
  const preference = await readDiscographyPreference(ownerId, artistId);
  const { discs, songDiscs } = await readDiscs(ownerId, artistId, preference.sections);
  const available = { disc: discs.length >= DISCOGRAPHY_MIN_DISCS, song: songViewAvailable(songDiscs) };
  return {
    artist: row,
    discs,
    songDiscs,
    preference,
    available,
    view: effectiveView(preference.view, available),
    progress: await readProgress(ownerId, artistId, discs.length),
  };
}

export async function isDiscographyShared(ownerId: string, artistId: string): Promise<boolean> {
  const rows = await db
    .select({ id: discographyShare.artistId })
    .from(discographyShare)
    .where(and(eq(discographyShare.userId, ownerId), eq(discographyShare.artistId, artistId)))
    .limit(1);
  return rows.length > 0;
}

/** La discografía para quien mira, o `null` sin revelar el motivo. Existe con una de sus dos vistas. */
export async function getDiscographyLamina(username: string, artistId: string, viewerId: string | null): Promise<DiscographyLamina | null> {
  if (!isValidUuid(artistId)) return null;
  const profile = await ifVisible(getProfileByUsername(username, viewerId));
  if (!profile || audiencesForProfile(profile).length === 0) return null;
  const isOwner = profile.relation === "self";
  const shared = await isDiscographyShared(profile.id, artistId);
  if (!isOwner && profile.relation !== "following" && !shared) return null;

  const discography = await readDiscography(profile.id, artistId);
  if (!discography) return null;
  const exists = discography.available.disc || discography.available.song;
  if (!exists && !isOwner) return null;
  return {
    ...discography,
    owner: { id: profile.id, username: profile.username, displayName: profile.displayName },
    missing: exists ? 0 : DISCOGRAPHY_MIN_DISCS - discography.discs.length,
    isOwner,
    shared,
  };
}

export interface DiscographyAlbum {
  lamina: DiscographyLamina;
  disc: DiscographySongDisc;
  /** Canciones valoradas que faltan para que exista; 0 si ya existe. */
  missing: number;
}

/** La Lámina de un álbum: un disco de la discografía mostrada, con las mismas reglas de quién mira. */
export async function getDiscographyAlbum(
  username: string,
  artistId: string,
  albumId: string,
  viewerId: string | null,
): Promise<DiscographyAlbum | null> {
  if (!isValidUuid(albumId)) return null;
  const lamina = await getDiscographyLamina(username, artistId, viewerId);
  const disc = lamina?.songDiscs.find((candidate) => candidate.id === albumId);
  if (!lamina || !disc || lamina.missing > 0) return null;
  const rated = disc.tracks.filter((track) => track.score).length;
  const missing = Math.max(DISCOGRAPHY_ALBUM_MIN_SONGS - rated, 0);
  if (missing > 0 && !lamina.isOwner) return null;
  return { lamina, disc, missing };
}

/** Cuántos discos de la discografía principal valoró: decide si la página del artista ofrece el enlace. */
export async function countRatedMainDiscs(ownerId: string, artistId: string): Promise<number> {
  return (await readDiscs(ownerId, artistId, [])).discs.length;
}

export interface DiscographyEntry {
  artistId: string;
  artistName: string;
  discCount: number;
}

/** Artistas con discografía, de mayor a menor. Clasifica lo valorado en código, con la misma regla que las secciones del artista. */
export async function listDiscographyEntries(ownerId: string): Promise<DiscographyEntry[]> {
  const rows = await db
    .select({
      discId: releaseGroup.id,
      artistId: artist.id,
      artistName: artist.name,
      role: credit.role,
      primaryType: releaseGroup.primaryType,
      secondaryTypes: releaseGroup.secondaryTypes,
      category: releaseGroup.category,
    })
    .from(rating)
    .innerJoin(releaseGroup, eq(releaseGroup.id, rating.releaseGroupId))
    .innerJoin(credit, eq(credit.releaseGroupId, releaseGroup.id))
    .innerJoin(artist, eq(artist.id, credit.artistId))
    .where(and(eq(rating.userId, ownerId), isNull(releaseGroup.discographyUnlistedAt), sql`${credit.role} = 'primary'`))
    .orderBy(asc(artist.name));

  const byArtist = new Map<string, DiscographyEntry & { discs: Set<string> }>();
  for (const row of rows) {
    if (!isMainDisc({ ...row, creditRole: "primary" })) continue;
    const entry = byArtist.get(row.artistId) ?? { artistId: row.artistId, artistName: row.artistName, discCount: 0, discs: new Set<string>() };
    entry.discs.add(row.discId);
    entry.discCount = entry.discs.size;
    byArtist.set(row.artistId, entry);
  }
  return [...byArtist.values()]
    .filter((entry) => entry.discCount >= DISCOGRAPHY_MIN_DISCS)
    .sort((a, b) => b.discCount - a.discCount || a.artistName.localeCompare(b.artistName))
    .slice(0, ENTRY_LIMIT)
    .map(({ artistId, artistName, discCount }) => ({ artistId, artistName, discCount }));
}

/** Los mejor valorados primero; a igual nota, el más antiguo. Decide qué discos llevan carátula en la imagen. */
export function bestRated<T extends { stars: number; detailedScore: number | null }>(discs: readonly T[], limit: number): Set<T> {
  const ranked = discs
    .map((disc, index) => ({ disc, index }))
    .sort((a, b) => discographyValue(b.disc) - discographyValue(a.disc) || a.index - b.index);
  return new Set(ranked.slice(0, limit).map(({ disc }) => disc));
}
