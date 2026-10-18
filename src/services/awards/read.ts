import { cache } from "react";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  artist,
  award,
  awardCategory,
  awardCategoryEdition,
  awardCeremony,
  awardNomination,
  credit,
  recording,
  releaseGroup,
  awardTierRank,
  type AwardCategoryTier,
  type AwardCoverage,
  type AwardHonors,
  type AwardSubjectKind,
} from "@/db/schema";
import { isCoverResolved } from "@/services/catalog/cover-resolution";

// Lectura de premios para las páginas (openspec: add-music-awards, design D5). Consultas planas a la base: nada
// sale a MusicBrainz ni a otra fuente al renderizar. Los nombres de categoría vienen en los dos idiomas y la página
// elige según el locale; títulos y nombres de artista no se traducen.

export interface CoverInfo {
  releaseGroupId: string;
  coverThumbUrl: string | null;
  coverResolved: boolean;
}

export interface AlbumRef {
  id: string;
  title: string;
  artistName: string | null;
  cover: CoverInfo;
}

export type NomineeSubject =
  | { kind: "release_group"; album: AlbumRef }
  | { kind: "recording"; id: string; title: string; artistName: string | null; anchor: AlbumRef | null }
  | { kind: "artist"; id: string; name: string; photoUrl: string | null };

export interface NominationView {
  id: string;
  won: boolean;
  text: string;
  credit: string | null;
  /** Sujeto del catálogo, o `null` si el nominado se muestra solo como texto. */
  subject: NomineeSubject | null;
}

export interface CategoryName {
  es: string;
  en: string;
}

export interface CategoryView {
  key: string;
  tier: AwardCategoryTier;
  /** Campo (pop, rock-alternative…) de las categorías de nivel `genre`; `null` en los demás niveles. */
  field: string | null;
  name: CategoryName;
  honors: AwardHonors;
  subjectKind: AwardSubjectKind;
  coverage: AwardCoverage;
  /** Ganadores primero, luego el resto, cada grupo en el orden curado. */
  nominations: NominationView[];
}

export interface CeremonySummary {
  year: number;
  edition: number;
  heldOn: string;
}

export interface CeremonyPage {
  awardSlug: string;
  ceremony: CeremonySummary;
  /** Todas las ceremonias cargadas del premio, de la más reciente a la más antigua. */
  ceremonies: CeremonySummary[];
  categories: CategoryView[];
}

export interface CategoryHistoryEntry {
  ceremony: CeremonySummary;
  coverage: AwardCoverage;
  nominations: NominationView[];
}

export interface CategoryHistoryPage {
  awardSlug: string;
  key: string;
  name: CategoryName;
  tier: AwardCategoryTier;
  honors: AwardHonors;
  predecessor: { key: string; name: CategoryName } | null;
  successors: { key: string; name: CategoryName }[];
  entries: CategoryHistoryEntry[];
}

export interface AwardIndexEntry {
  slug: string;
  ceremonies: CeremonySummary[];
}

const ceremonyColumns = { year: awardCeremony.year, edition: awardCeremony.edition, heldOn: awardCeremony.heldOn };

/** Primer artista principal de cada álbum o grabación, para armar los enlaces con nombre. */
async function primaryArtistNames(
  column: typeof credit.releaseGroupId | typeof credit.recordingId,
  ids: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;
  const rows = await db
    .select({ targetId: column, name: artist.name })
    .from(credit)
    .innerJoin(artist, eq(artist.id, credit.artistId))
    .where(and(inArray(column, ids), eq(credit.role, "primary")))
    .orderBy(asc(credit.position));
  for (const row of rows) if (row.targetId && !names.has(row.targetId)) names.set(row.targetId, row.name);
  return names;
}

async function albumRefs(ids: string[]): Promise<Map<string, AlbumRef>> {
  const refs = new Map<string, AlbumRef>();
  if (ids.length === 0) return refs;
  const [rows, artists] = await Promise.all([
    db
      .select({
        id: releaseGroup.id,
        title: releaseGroup.title,
        coverThumbUrl: releaseGroup.coverThumbUrl,
        coverCheckedAt: releaseGroup.coverCheckedAt,
        coverBlockedAt: releaseGroup.coverBlockedAt,
      })
      .from(releaseGroup)
      .where(inArray(releaseGroup.id, ids)),
    primaryArtistNames(credit.releaseGroupId, ids),
  ]);
  for (const row of rows) {
    refs.set(row.id, {
      id: row.id,
      title: row.title,
      artistName: artists.get(row.id) ?? null,
      cover: { releaseGroupId: row.id, coverThumbUrl: row.coverThumbUrl, coverResolved: isCoverResolved(row) },
    });
  }
  return refs;
}

type NominationRow = typeof awardNomination.$inferSelect;

/** Arma las vistas de nominaciones resolviendo sus sujetos del catálogo con pocas consultas. */
async function nominationViews(rows: NominationRow[]): Promise<Map<string, NominationView>> {
  const albumIds = new Set<string>();
  const recordingIds: string[] = [];
  const artistIds: string[] = [];
  for (const row of rows) {
    if (row.releaseGroupId) albumIds.add(row.releaseGroupId);
    if (row.anchorReleaseGroupId) albumIds.add(row.anchorReleaseGroupId);
    if (row.recordingId) recordingIds.push(row.recordingId);
    if (row.artistId) artistIds.push(row.artistId);
  }
  const [albums, recordings, recordingArtists, artists] = await Promise.all([
    albumRefs([...albumIds]),
    recordingIds.length
      ? db.select({ id: recording.id, title: recording.title }).from(recording).where(inArray(recording.id, recordingIds))
      : Promise.resolve([]),
    primaryArtistNames(credit.recordingId, recordingIds),
    artistIds.length
      ? db
          .select({ id: artist.id, name: artist.name, photoUrl: artist.photoUrl, photoBlockedAt: artist.photoBlockedAt })
          .from(artist)
          .where(inArray(artist.id, artistIds))
      : Promise.resolve([]),
  ]);
  const recordingById = new Map(recordings.map((r) => [r.id, r]));
  const artistById = new Map(artists.map((a) => [a.id, a]));

  const views = new Map<string, NominationView>();
  for (const row of rows) {
    let subject: NomineeSubject | null = null;
    const album = row.releaseGroupId ? albums.get(row.releaseGroupId) : undefined;
    const rec = row.recordingId ? recordingById.get(row.recordingId) : undefined;
    const person = row.artistId ? artistById.get(row.artistId) : undefined;
    if (album) subject = { kind: "release_group", album };
    else if (rec) {
      subject = {
        kind: "recording",
        id: rec.id,
        title: rec.title,
        artistName: recordingArtists.get(rec.id) ?? null,
        anchor: row.anchorReleaseGroupId ? (albums.get(row.anchorReleaseGroupId) ?? null) : null,
      };
    } else if (person) {
      subject = { kind: "artist", id: person.id, name: person.name, photoUrl: person.photoBlockedAt ? null : person.photoUrl };
    }
    views.set(row.id, { id: row.id, won: row.won, text: row.nomineeText, credit: row.creditText, subject });
  }
  return views;
}

/** Ganadores primero; dentro de cada grupo, el orden curado. */
export function orderNominations(
  rows: Pick<NominationRow, "id" | "won" | "sortOrder">[],
  views: Map<string, NominationView>,
): NominationView[] {
  return [...rows]
    .sort((a, b) => Number(b.won) - Number(a.won) || a.sortOrder - b.sortOrder)
    .map((row) => views.get(row.id)!);
}

/**
 * Niveles en su orden de presentación (`awardTierRank`); dentro de cada nivel, el orden curado, que mantiene juntas
 * las categorías de un mismo campo (lo valida `validateCategories`).
 */
export function sortCategoryEditions<T extends { tier: AwardCategoryTier; sortOrder: number }>(editions: T[]): T[] {
  return [...editions].sort((a, b) => awardTierRank(a.tier) - awardTierRank(b.tier) || a.sortOrder - b.sortOrder);
}

async function awardId(slug: string): Promise<string | null> {
  const [row] = await db.select({ id: award.id }).from(award).where(eq(award.slug, slug)).limit(1);
  return row?.id ?? null;
}

async function ceremoniesOf(awardIdValue: string): Promise<CeremonySummary[]> {
  return db.select(ceremonyColumns).from(awardCeremony).where(eq(awardCeremony.awardId, awardIdValue)).orderBy(desc(awardCeremony.year));
}

/** Índice: premios con sus ceremonias cargadas, de la más reciente a la más antigua. */
export async function listAwards(): Promise<AwardIndexEntry[]> {
  const rows = await db
    .select({ slug: award.slug, ...ceremonyColumns })
    .from(award)
    .innerJoin(awardCeremony, eq(awardCeremony.awardId, award.id))
    .orderBy(asc(award.slug), desc(awardCeremony.year));
  const bySlug = new Map<string, CeremonySummary[]>();
  for (const { slug, ...ceremony } of rows) bySlug.set(slug, [...(bySlug.get(slug) ?? []), ceremony]);
  return [...bySlug].map(([slug, ceremonies]) => ({ slug, ceremonies }));
}

/** Últimas ceremonias de todos los premios (sección "Premios" de Explorar). */
export interface CeremonyHeadline {
  /** Categoría del titular: la general de álbum con menor orden curado (en los Grammy, Álbum del año). */
  category: CategoryName;
  winner: NominationView;
}

export interface RecentCeremony extends CeremonySummary {
  awardSlug: string;
  /** Ganador destacado de la ceremonia; `null` si no hay categoría general de álbum con ganador cargado. */
  headline: CeremonyHeadline | null;
}

/**
 * Últimas ceremonias cargadas (de la más reciente a la más antigua), cada una con su ganador destacado para la
 * tarjeta de Explorar. Dos consultas más para todas las ceremonias juntas, no una por tarjeta.
 */
export async function listRecentCeremonies(limit: number): Promise<RecentCeremony[]> {
  const ceremonies = await db
    .select({ id: awardCeremony.id, awardSlug: award.slug, ...ceremonyColumns })
    .from(awardCeremony)
    .innerJoin(award, eq(award.id, awardCeremony.awardId))
    .orderBy(desc(awardCeremony.heldOn))
    .limit(limit);
  if (ceremonies.length === 0) return [];

  const winners = await db
    .select({
      ceremonyId: awardCategoryEdition.ceremonyId,
      nameEs: awardCategory.nameEs,
      nameEn: awardCategory.nameEn,
      categoryOrder: awardCategory.sortOrder,
      nomination: awardNomination,
    })
    .from(awardNomination)
    .innerJoin(awardCategoryEdition, eq(awardCategoryEdition.id, awardNomination.categoryEditionId))
    .innerJoin(awardCategory, eq(awardCategory.id, awardCategoryEdition.categoryId))
    .where(
      and(
        inArray(
          awardCategoryEdition.ceremonyId,
          ceremonies.map((c) => c.id),
        ),
        eq(awardNomination.won, true),
        eq(awardCategory.tier, "general"),
        eq(awardCategory.subjectKind, "release_group"),
      ),
    )
    .orderBy(asc(awardCategory.sortOrder), asc(awardNomination.sortOrder));

  // El primero por ceremonia (ya ordenados por categoría y luego por nominación).
  const firstByCeremony = new Map<string, (typeof winners)[number]>();
  for (const row of winners) if (!firstByCeremony.has(row.ceremonyId)) firstByCeremony.set(row.ceremonyId, row);
  const views = await nominationViews([...firstByCeremony.values()].map((row) => row.nomination));

  return ceremonies.map(({ id, ...ceremony }) => {
    const row = firstByCeremony.get(id);
    const winner = row ? views.get(row.nomination.id) : undefined;
    return {
      ...ceremony,
      headline: row && winner ? { category: { es: row.nameEs, en: row.nameEn }, winner } : null,
    };
  });
}

/** Año de la ceremonia más reciente cargada de un premio; `null` si el premio no existe o no tiene ceremonias. */
export const getLatestCeremonyYear = cache(async (slug: string): Promise<number | null> => {
  const id = await awardId(slug);
  if (!id) return null;
  return (await ceremoniesOf(id))[0]?.year ?? null;
});

/** Página de una ceremonia; `null` si el premio o el año no están cargados. */
export const getCeremonyPage = cache(async (slug: string, year: number): Promise<CeremonyPage | null> => {
  if (!Number.isInteger(year)) return null;
  const id = await awardId(slug);
  if (!id) return null;
  const ceremonies = await ceremoniesOf(id);
  const ceremony = ceremonies.find((c) => c.year === year);
  if (!ceremony) return null;

  const editions = await db
    .select({
      editionId: awardCategoryEdition.id,
      coverage: awardCategoryEdition.coverage,
      key: awardCategory.key,
      tier: awardCategory.tier,
      field: awardCategory.field,
      nameEs: awardCategory.nameEs,
      nameEn: awardCategory.nameEn,
      honors: awardCategory.honors,
      subjectKind: awardCategory.subjectKind,
      sortOrder: awardCategory.sortOrder,
    })
    .from(awardCategoryEdition)
    .innerJoin(awardCategory, eq(awardCategory.id, awardCategoryEdition.categoryId))
    .innerJoin(awardCeremony, eq(awardCeremony.id, awardCategoryEdition.ceremonyId))
    .where(and(eq(awardCeremony.awardId, id), eq(awardCeremony.year, year)));

  const rows = editions.length
    ? await db.select().from(awardNomination).where(inArray(awardNomination.categoryEditionId, editions.map((e) => e.editionId)))
    : [];
  const views = await nominationViews(rows);
  return {
    awardSlug: slug,
    ceremony,
    ceremonies,
    categories: sortCategoryEditions(editions).map((e) => ({
      key: e.key,
      tier: e.tier,
      field: e.field,
      name: { es: e.nameEs, en: e.nameEn },
      honors: e.honors,
      subjectKind: e.subjectKind,
      coverage: e.coverage,
      nominations: orderNominations(rows.filter((r) => r.categoryEditionId === e.editionId), views),
    })),
  };
});

/** Historia de una categoría; `null` si la clave no existe para ese premio. */
export const getCategoryHistory = cache(async (slug: string, key: string): Promise<CategoryHistoryPage | null> => {
  const id = await awardId(slug);
  if (!id) return null;
  const categories = await db.select().from(awardCategory).where(eq(awardCategory.awardId, id));
  const category = categories.find((c) => c.key === key);
  if (!category) return null;
  const nameOf = (c: (typeof categories)[number]) => ({ key: c.key, name: { es: c.nameEs, en: c.nameEn } });
  const predecessorRow = category.predecessorId ? categories.find((c) => c.id === category.predecessorId) : undefined;

  const editions = await db
    .select({ editionId: awardCategoryEdition.id, coverage: awardCategoryEdition.coverage, ...ceremonyColumns })
    .from(awardCategoryEdition)
    .innerJoin(awardCeremony, eq(awardCeremony.id, awardCategoryEdition.ceremonyId))
    .where(eq(awardCategoryEdition.categoryId, category.id))
    .orderBy(desc(awardCeremony.year));
  const rows = editions.length
    ? await db.select().from(awardNomination).where(inArray(awardNomination.categoryEditionId, editions.map((e) => e.editionId)))
    : [];
  const views = await nominationViews(rows);

  return {
    awardSlug: slug,
    key: category.key,
    name: { es: category.nameEs, en: category.nameEn },
    tier: category.tier,
    honors: category.honors,
    predecessor: predecessorRow ? nameOf(predecessorRow) : null,
    successors: categories.filter((c) => c.predecessorId === category.id).map(nameOf),
    entries: editions.map((e) => ({
      ceremony: { year: e.year, edition: e.edition, heldOn: e.heldOn },
      coverage: e.coverage,
      nominations: orderNominations(rows.filter((r) => r.categoryEditionId === e.editionId), views),
    })),
  };
});
