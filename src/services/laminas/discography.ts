// Lámina de discografía (openspec: add-discography-lamina-phase1, docs/05-features/sharing.md §4.1, ADR 0053): lo que una
// persona valoró de la discografía principal de un artista. Es derivada: se calcula en cada lectura y no tiene editor.
// `rating` no tiene audiencia, así que la ven el dueño y sus seguidores; a cualquier otro visitante se la abre solo la marca
// de `discography_share`, y esa marca no vuelve públicas las valoraciones en otro lugar.

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, credit, discographyShare, rating, releaseGroup, userList } from "@/db/schema";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { DISCOGRAPHY_MIN_DISCS, discographyValue } from "@/lib/laminas/discography";
import { isValidUuid } from "@/lib/validation";
import { compareByYear } from "@/services/catalog/artist-discography-view";
import { discographySection } from "@/services/catalog/discography-sections";
import { readArtistDiscography, type DiscographyRow } from "@/services/catalog/ingest-discography";
import { countsByListId } from "@/services/journeys/progress";
import { ifVisible } from "@/services/share/targets/shared";
import { getProfileByUsername } from "@/services/social/profiles";
import { audiencesForProfile } from "@/services/social/visibility";

const ENTRY_LIMIT = 12;

export interface DiscographyDisc {
  id: string;
  title: string;
  year: number | null;
  coverThumbUrl: string | null;
  stars: number;
  detailedScore: number | null;
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
  progress: DiscographyProgress;
  /** Cuántos discos valorados faltan para que exista; 0 si ya existe. */
  missing: number;
  isOwner: boolean;
  shared: boolean;
}

function isMainDisc(row: Pick<DiscographyRow, "primaryType" | "secondaryTypes" | "category" | "creditRole">): boolean {
  const { primaryType, secondaryTypes, creditRole } = row;
  return discographySection({ primaryType, secondaryTypes, creditRole, category: row.category as ReleaseGroupCategory }) === "main";
}

async function readRatedDiscs(ownerId: string, artistId: string): Promise<DiscographyDisc[]> {
  const main = (await readArtistDiscography(artistId)).filter(isMainDisc);
  if (main.length === 0) return [];
  const ratings = await db
    .select({ id: rating.releaseGroupId, stars: rating.stars, detailedScore: rating.detailedScore })
    .from(rating)
    .where(and(eq(rating.userId, ownerId), inArray(rating.releaseGroupId, main.map((row) => row.id))));
  const byDisc = new Map(ratings.map((row) => [row.id, row]));
  return main
    .flatMap((row) => {
      const score = byDisc.get(row.id);
      if (!score) return [];
      const { id, title, firstReleaseYear: year, coverThumbUrl } = row;
      return [{ id, title, year, coverThumbUrl, stars: Number(score.stars), detailedScore: score.detailedScore }];
    })
    .sort(compareByYear);
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

/** Discos y progreso, sin decidir quién mira. */
async function readDiscography(ownerId: string, artistId: string) {
  const [row] = await db.select({ id: artist.id, name: artist.name }).from(artist).where(eq(artist.id, artistId)).limit(1);
  if (!row) return null;
  const discs = await readRatedDiscs(ownerId, artistId);
  return { artist: row, discs, progress: await readProgress(ownerId, artistId, discs.length) };
}

export async function isDiscographyShared(ownerId: string, artistId: string): Promise<boolean> {
  const rows = await db
    .select({ id: discographyShare.artistId })
    .from(discographyShare)
    .where(and(eq(discographyShare.userId, ownerId), eq(discographyShare.artistId, artistId)))
    .limit(1);
  return rows.length > 0;
}

/** La discografía para quien mira, o `null` sin revelar el motivo. */
export async function getDiscographyLamina(username: string, artistId: string, viewerId: string | null): Promise<DiscographyLamina | null> {
  if (!isValidUuid(artistId)) return null;
  const profile = await ifVisible(getProfileByUsername(username, viewerId));
  if (!profile || audiencesForProfile(profile).length === 0) return null;
  const isOwner = profile.relation === "self";
  const shared = await isDiscographyShared(profile.id, artistId);
  if (!isOwner && profile.relation !== "following" && !shared) return null;

  const discography = await readDiscography(profile.id, artistId);
  if (!discography) return null;
  const missing = Math.max(DISCOGRAPHY_MIN_DISCS - discography.discs.length, 0);
  if (missing > 0 && !isOwner) return null;
  return {
    ...discography,
    owner: { id: profile.id, username: profile.username, displayName: profile.displayName },
    missing,
    isOwner,
    shared,
  };
}

/** Cuántos discos de la discografía principal valoró: decide si la página del artista ofrece el enlace. */
export async function countRatedMainDiscs(ownerId: string, artistId: string): Promise<number> {
  return (await readRatedDiscs(ownerId, artistId)).length;
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
