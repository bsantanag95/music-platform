import { cache } from "react";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
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
  type AwardVoting,
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
  /** Quién decide el premio; `null` si el premio se cargó antes de la migración 0073 y no se volvió a cargar. */
  voting: AwardVoting | null;
  ceremony: CeremonySummary;
  /** Fuente contra la que se curó la ceremonia; `null` hasta la próxima carga (migración 0073). */
  sourceUrl: string | null;
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

async function awardRow(slug: string): Promise<{ id: string; voting: AwardVoting | null } | null> {
  const [row] = await db.select({ id: award.id, voting: award.voting }).from(award).where(eq(award.slug, slug)).limit(1);
  return row ?? null;
}

async function ceremoniesOf(awardIdValue: string): Promise<CeremonySummary[]> {
  return db.select(ceremonyColumns).from(awardCeremony).where(eq(awardCeremony.awardId, awardIdValue)).orderBy(desc(awardCeremony.year));
}

export interface CeremonyHeadline {
  /** Categoría del titular: la general de álbum con menor orden curado (en los Grammy, Álbum del año). */
  category: CategoryName;
  winner: NominationView;
}

/** La ceremonia más reciente de un premio (tarjeta de la sección "Premios" de Explorar y del hub `/awards`). */
export interface LatestCeremony extends CeremonySummary {
  awardSlug: string;
  /** Quién decide el premio; `null` hasta la próxima carga (migración 0073). */
  voting: AwardVoting | null;
  /** Años de todas las ceremonias cargadas del premio, del más reciente al más antiguo (incluye el de esta). */
  years: number[];
  /** Ganador destacado de la ceremonia; `null` si no hay categoría general de álbum con ganador cargado. */
  headline: CeremonyHeadline | null;
}

/**
 * La ceremonia más reciente de cada premio, de la más reciente a la más antigua (por `heldOn`), sin importar cuántas
 * ceremonias más recientes tengan los demás. Pura: la consulta trae todas las ceremonias (unas decenas) y aquí se elige.
 */
export function latestPerAward<T extends { awardSlug: string; heldOn: string }>(ceremonies: T[]): T[] {
  const sorted = [...ceremonies].sort((a, b) => b.heldOn.localeCompare(a.heldOn) || a.awardSlug.localeCompare(b.awardSlug));
  const seen = new Set<string>();
  return sorted.filter((c) => (seen.has(c.awardSlug) ? false : (seen.add(c.awardSlug), true)));
}

/**
 * Ganador destacado de cada ceremonia: el primero de la categoría general de álbum con menor orden curado (en los Grammy,
 * Álbum del año). Una consulta para todas las ceremonias juntas, no una por ceremonia.
 */
async function headlinesFor(ceremonyIds: string[]): Promise<Map<string, CeremonyHeadline>> {
  const result = new Map<string, CeremonyHeadline>();
  if (ceremonyIds.length === 0) return result;
  const winners = await db
    .select({
      ceremonyId: awardCategoryEdition.ceremonyId,
      nameEs: awardCategory.nameEs,
      nameEn: awardCategory.nameEn,
      nomination: awardNomination,
    })
    .from(awardNomination)
    .innerJoin(awardCategoryEdition, eq(awardCategoryEdition.id, awardNomination.categoryEditionId))
    .innerJoin(awardCategory, eq(awardCategory.id, awardCategoryEdition.categoryId))
    .where(
      and(
        inArray(awardCategoryEdition.ceremonyId, ceremonyIds),
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
  for (const [ceremonyId, row] of firstByCeremony) {
    const winner = views.get(row.nomination.id);
    if (winner) result.set(ceremonyId, { category: { es: row.nameEs, en: row.nameEn }, winner });
  }
  return result;
}

/** Todas las ceremonias cargadas, con su premio (unas decenas): las funciones puras de abajo eligen cuáles mostrar. */
async function allCeremonies() {
  return db
    .select({ id: awardCeremony.id, awardSlug: award.slug, voting: award.voting, ...ceremonyColumns })
    .from(awardCeremony)
    .innerJoin(award, eq(award.id, awardCeremony.awardId));
}

/**
 * Una tarjeta por premio: su ceremonia más reciente con el ganador destacado, quién vota y los años cargados. Dos
 * consultas para todas las tarjetas juntas (más las de los sujetos), no una por tarjeta.
 */
export async function listLatestCeremoniesByAward(): Promise<LatestCeremony[]> {
  const all = await allCeremonies();
  const ceremonies = latestPerAward(all);
  if (ceremonies.length === 0) return [];
  const headlines = await headlinesFor(ceremonies.map((c) => c.id));
  const yearsOf = (slug: string) =>
    all
      .filter((c) => c.awardSlug === slug)
      .map((c) => c.year)
      .sort((a, b) => b - a);

  return ceremonies.map(({ id, ...ceremony }) => ({
    ...ceremony,
    years: yearsOf(ceremony.awardSlug),
    headline: headlines.get(id) ?? null,
  }));
}

/** Un ganador del muro "Ganadores recientes" del hub. */
export interface RecentHeadlineWinner extends CeremonyHeadline {
  awardSlug: string;
  year: number;
}

/**
 * Las últimas `perAward` ceremonias de cada premio, de la más reciente a la más antigua (por `heldOn`), sin importar
 * cuántas ceremonias tengan los demás premios. Pura, como `latestPerAward`.
 */
export function recentPerAward<T extends { awardSlug: string; heldOn: string }>(ceremonies: T[], perAward: number): T[] {
  const sorted = [...ceremonies].sort((a, b) => b.heldOn.localeCompare(a.heldOn) || a.awardSlug.localeCompare(b.awardSlug));
  const taken = new Map<string, number>();
  return sorted.filter((c) => {
    const count = taken.get(c.awardSlug) ?? 0;
    if (count >= perAward) return false;
    taken.set(c.awardSlug, count + 1);
    return true;
  });
}

/**
 * Muro "Ganadores recientes" del hub `/awards` (openspec: enrich-awards-hub): el ganador destacado de las últimas
 * `perAward` ceremonias de cada premio, de la ceremonia más reciente a la más antigua. Una ceremonia sin ganador destacado
 * no aporta nada.
 */
export async function listRecentHeadlineWinners(perAward = 3): Promise<RecentHeadlineWinner[]> {
  const ceremonies = recentPerAward(await allCeremonies(), perAward);
  const headlines = await headlinesFor(ceremonies.map((c) => c.id));
  return ceremonies.flatMap((c) => {
    const headline = headlines.get(c.id);
    return headline ? [{ awardSlug: c.awardSlug, year: c.year, ...headline }] : [];
  });
}

/** Una fila del ranking "Los más premiados" del hub. */
export interface MostAwardedArtist {
  id: string;
  name: string;
  photoUrl: string | null;
  /** Premios ganados: nominaciones ganadoras, sumando todas las ceremonias y todos los premios. */
  wins: number;
  /** Premios distintos en los que ganó (slugs, en orden alfabético). */
  awardSlugs: string[];
}

/** Mínimo de premios ganados para entrar al ranking: con uno solo, medio catálogo empataría. */
export const MOST_AWARDED_MIN_WINS = 2;

/**
 * Ranking "Los más premiados" del hub (openspec: enrich-awards-hub): los artistas con más nominaciones ganadas, cruzando
 * todos los premios y ceremonias. Solo cuentan las categorías que premian al intérprete (`honors = 'performer'`): una de
 * compositores premia a los autores, no al artista de la grabación. El premio es del artista nominado o, si el nominado es
 * un álbum o una grabación, de sus artistas principales (un dúo suma a los dos); un nominado que solo es texto, sin sujeto
 * del catálogo, no cuenta. Empates: más ceremonias distintas, luego el premio más reciente, luego el nombre.
 */
export async function listMostAwardedArtists(limit = 10): Promise<MostAwardedArtist[]> {
  const rows = (await db.execute(sql`
    WITH wins AS (
      SELECT n.id AS nomination_id, n.artist_id, n.release_group_id, n.recording_id,
             c.id AS ceremony_id, c.held_on, a.slug AS award_slug
      FROM award_nomination n
      JOIN award_category_edition e ON e.id = n.category_edition_id
      JOIN award_category k ON k.id = e.category_id
      JOIN award_ceremony c ON c.id = e.ceremony_id
      JOIN award a ON a.id = c.award_id
      WHERE n.won AND k.honors = 'performer'
    ), credited AS (
      SELECT w.nomination_id, w.ceremony_id, w.held_on, w.award_slug, w.artist_id AS credited_id
      FROM wins w WHERE w.artist_id IS NOT NULL
      UNION
      SELECT w.nomination_id, w.ceremony_id, w.held_on, w.award_slug, cr.artist_id
      FROM wins w JOIN credit cr ON cr.release_group_id = w.release_group_id AND cr.role = 'primary'
      UNION
      SELECT w.nomination_id, w.ceremony_id, w.held_on, w.award_slug, cr.artist_id
      FROM wins w JOIN credit cr ON cr.recording_id = w.recording_id AND cr.role = 'primary'
    )
    SELECT ar.id, ar.name,
           CASE WHEN ar.photo_blocked_at IS NULL THEN ar.photo_url END AS photo_url,
           count(DISTINCT cd.nomination_id)::int AS wins,
           array_agg(DISTINCT cd.award_slug ORDER BY cd.award_slug) AS award_slugs
    FROM credited cd
    JOIN artist ar ON ar.id = cd.credited_id
    GROUP BY ar.id
    HAVING count(DISTINCT cd.nomination_id) >= ${MOST_AWARDED_MIN_WINS}
    ORDER BY wins DESC, count(DISTINCT cd.ceremony_id) DESC, max(cd.held_on) DESC, ar.name
    LIMIT ${limit}
  `)) as unknown as { id: string; name: string; photo_url: string | null; wins: number; award_slugs: string[] }[];
  return rows.map((row) => ({ id: row.id, name: row.name, photoUrl: row.photo_url, wins: row.wins, awardSlugs: row.award_slugs }));
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
  const awardInfo = await awardRow(slug);
  if (!awardInfo) return null;
  const id = awardInfo.id;
  const ceremonies = await ceremoniesOf(id);
  const ceremony = ceremonies.find((c) => c.year === year);
  if (!ceremony) return null;
  const [source] = await db
    .select({ sourceUrl: awardCeremony.sourceUrl })
    .from(awardCeremony)
    .where(and(eq(awardCeremony.awardId, id), eq(awardCeremony.year, year)))
    .limit(1);

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
    voting: awardInfo.voting,
    ceremony,
    sourceUrl: source?.sourceUrl ?? null,
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
