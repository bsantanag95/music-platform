import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, credit, listenEntry, rating } from "@/db/schema";
import type { ReleaseGroupCategory } from "@/lib/api/schemas";
import { COMMUNITY_MIN_COUNT } from "./album-community-shared";
import { isCoverResolved } from "./cover-resolution";
import { DISCOGRAPHY_SECTIONS, discographySection, type DiscographySection } from "./discography-sections";
import { readArtistDiscography, type DiscographyRow } from "./ingest-discography";

// Discografía de la página de artista (openspec: redesign-artist-page, capability
// `artist-discography-view`, design D2 y D3): solo la discografía propia del artista (nunca
// la de sus grupos), sin los release-groups fuera de la discografía, clasificada en
// secciones y con la valoración de la comunidad por disco. Todo en consultas agrupadas.

export interface ArtistDiscographyItem {
  id: string;
  title: string;
  year: number | null;
  coverThumbUrl: string | null;
  coverResolved: boolean;
  section: DiscographySection;
  /**
   * Tipos para la etiqueta de la tabla, en minúsculas ("album", "live", "soundtrack", …).
   * Sin tipos crudos guardados, la categoría (`studio`, `live_other`, …).
   */
  kinds: string[];
  isEp: boolean;
  /** Media de estrellas solo con al menos 5 valoraciones; siempre la cantidad. */
  community: { average: number | null; count: number };
  /** Artista principal del disco, en Apariciones. */
  primaryArtist: { id: string; name: string } | null;
}

export interface ArtistDiscographyView {
  /** Secciones con discos, en el orden fijo de la página. */
  sections: { key: DiscographySection; items: ArtistDiscographyItem[] }[];
  /** Disco de Principal con mejor media (≥5 valoraciones; empate: más valoraciones). */
  bestRatedId: string | null;
  /** Año del primer disco de Principal: la actividad de un solista. */
  firstMainYear: number | null;
}

function kindsOf(row: Pick<DiscographyRow, "primaryType" | "secondaryTypes" | "category">): string[] {
  if (row.primaryType === null && row.secondaryTypes === null) return [row.category];
  return [row.primaryType, ...(row.secondaryTypes ?? [])]
    .filter((kind): kind is string => Boolean(kind))
    .map((kind) => kind.toLowerCase());
}

/** Año ascendente; sin año al final, en orden estable por título. */
export function compareByYear(a: { year: number | null; title: string }, b: { year: number | null; title: string }): number {
  if (a.year === null && b.year === null) return a.title.localeCompare(b.title);
  if (a.year === null) return 1;
  if (b.year === null) return -1;
  return a.year - b.year || a.title.localeCompare(b.title);
}

/** "Mejor valorado": mayor media entre los que tienen media; empate, más valoraciones. */
export function pickBestRated(items: ArtistDiscographyItem[]): string | null {
  let best: ArtistDiscographyItem | null = null;
  for (const item of items) {
    const average = item.community.average;
    if (average === null) continue;
    const bestAverage = best?.community.average ?? null;
    if (
      best === null ||
      bestAverage === null ||
      average > bestAverage ||
      (average === bestAverage && item.community.count > best.community.count)
    ) {
      best = item;
    }
  }
  return best?.id ?? null;
}

/** Arma la vista desde filas ya leídas (función pura). */
export function buildDiscographyView(
  rows: DiscographyRow[],
  ratings: Map<string, { average: number; count: number }>,
  primaryArtists: Map<string, { id: string; name: string }>,
): ArtistDiscographyView {
  const bySection = new Map<DiscographySection, ArtistDiscographyItem[]>();
  for (const row of rows) {
    const section = discographySection({
      primaryType: row.primaryType,
      secondaryTypes: row.secondaryTypes,
      category: row.category as ReleaseGroupCategory,
      creditRole: row.creditRole,
    });
    const stats = ratings.get(row.id);
    const count = stats?.count ?? 0;
    const item: ArtistDiscographyItem = {
      id: row.id,
      title: row.title,
      year: row.firstReleaseYear,
      coverThumbUrl: row.coverThumbUrl,
      coverResolved: isCoverResolved(row),
      section,
      kinds: kindsOf(row),
      isEp: row.primaryType === "EP",
      community: { average: stats && count >= COMMUNITY_MIN_COUNT ? stats.average : null, count },
      primaryArtist: section === "appearances" ? (primaryArtists.get(row.id) ?? null) : null,
    };
    bySection.set(section, [...(bySection.get(section) ?? []), item]);
  }

  const sections = DISCOGRAPHY_SECTIONS.flatMap((key) => {
    const items = bySection.get(key);
    return items?.length ? [{ key, items: [...items].sort(compareByYear) }] : [];
  });
  const main = sections.find((s) => s.key === "main")?.items ?? [];
  return {
    sections,
    bestRatedId: pickBestRated(main),
    firstMainYear: main.find((item) => item.year !== null)?.year ?? null,
  };
}

export async function getArtistDiscography(artistId: string): Promise<ArtistDiscographyView> {
  const rows = await readArtistDiscography(artistId);
  const ids = rows.map((row) => row.id);
  const appearanceIds = rows.filter((row) => row.creditRole === "featured").map((row) => row.id);

  const [ratingRows, primaryRows] = await Promise.all([
    ids.length === 0
      ? Promise.resolve([])
      : db
          .select({
            releaseGroupId: rating.releaseGroupId,
            average: sql<number>`avg(${rating.stars})::float`,
            count: sql<number>`count(*)::int`,
          })
          .from(rating)
          .where(inArray(rating.releaseGroupId, ids))
          .groupBy(rating.releaseGroupId),
    appearanceIds.length === 0
      ? Promise.resolve([])
      : db
          .select({ releaseGroupId: credit.releaseGroupId, id: artist.id, name: artist.name })
          .from(credit)
          .innerJoin(artist, eq(artist.id, credit.artistId))
          .where(and(inArray(credit.releaseGroupId, appearanceIds), eq(credit.position, 0))),
  ]);

  const ratings = new Map(
    ratingRows.flatMap((r) => (r.releaseGroupId ? [[r.releaseGroupId, { average: r.average, count: r.count }] as const] : [])),
  );
  const primaryArtists = new Map(
    primaryRows.flatMap((r) => (r.releaseGroupId ? [[r.releaseGroupId, { id: r.id, name: r.name }] as const] : [])),
  );
  return buildDiscographyView(rows, ratings, primaryArtists);
}

export interface DiscographyMarks {
  /** Discos con al menos una escucha del usuario. */
  listened: string[];
  /** Estrellas propias por disco. */
  stars: Record<string, number>;
}

/** Marcas personales del usuario sobre los discos de la discografía, en dos consultas. */
export async function getDiscographyMarks(userId: string, releaseGroupIds: string[]): Promise<DiscographyMarks> {
  if (releaseGroupIds.length === 0) return { listened: [], stars: {} };
  const [listenedRows, starRows] = await Promise.all([
    db
      .selectDistinct({ releaseGroupId: listenEntry.releaseGroupId })
      .from(listenEntry)
      .where(
        and(eq(listenEntry.userId, userId), inArray(listenEntry.releaseGroupId, releaseGroupIds), isNotNull(listenEntry.releaseGroupId)),
      ),
    db
      .select({ releaseGroupId: rating.releaseGroupId, stars: rating.stars })
      .from(rating)
      .where(and(eq(rating.userId, userId), inArray(rating.releaseGroupId, releaseGroupIds))),
  ]);
  return {
    listened: listenedRows.flatMap((r) => (r.releaseGroupId ? [r.releaseGroupId] : [])),
    stars: Object.fromEntries(starRows.flatMap((r) => (r.releaseGroupId ? [[r.releaseGroupId, Number(r.stars)]] : []))),
  };
}
