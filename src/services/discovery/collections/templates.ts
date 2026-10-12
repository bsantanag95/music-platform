// Plantillas de las colecciones generadas de /explore (openspec: automate-explore-collections y
// add-day-zero-collections, ADR 0033 y 0035). Cada plantilla es una regla: `plan(now)` devuelve el
// período, el título y los candidatos (ids de release_group, del mejor al peor). Solo usa datos del
// catálogo, de los premios, del calendario y de la comunidad propia (nunca afinidad personal).

import { and, asc, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { rating, releaseGroup, review } from "@/db/schema";
import { CANDIDATE_POOL, COLLECTION_SIZE, MIN_RATINGS_PER_ALBUM, NEW_RELEASE_CATEGORIES, NEW_RELEASE_WINDOW_DAYS } from "../constants";
import { anniversaries, genreSpotlight, grammyWinners, upcoming } from "./templates-day-zero";
import { EVERGREEN, MONTHS, monthKey } from "./periods";
import { albumSignalOrder, coverResolvableCondition } from "./signal";
import type { CollectionTemplate } from "./types";

export type { CollectionTemplate, CollectionPlan, PlanContext, PlanResult } from "./types";
export { EVERGREEN, MONTHS };

/** Peso con que nacen las colecciones de comunidad: pasan por delante de las del día 0 dentro del tope. */
export const COMMUNITY_WEIGHT = 10;

export function quarterOf(now: Date): number {
  return Math.floor(now.getUTCMonth() / 3) + 1;
}

/** Inicio (UTC) del trimestre de `now`, en ISO. */
export function quarterStartIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), (quarterOf(now) - 1) * 3, 1)).toISOString();
}

/** Inicio (UTC) del mes de `now`, en ISO. */
export function monthStartIso(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export const quarterPeriodKey = (now: Date) => `${now.getUTCFullYear()}-Q${quarterOf(now)}`;
export const quarterTitle = (now: Date) => `Mejor valorados del ${quarterOf(now)}.º trimestre de ${now.getUTCFullYear()}`;
export const monthPeriodKey = monthKey;
export const reviewedMonthTitle = (now: Date) =>
  `Lo más reseñado de ${MONTHS[now.getUTCMonth()]} de ${now.getUTCFullYear()}`;

const newReleases: CollectionTemplate = {
  key: "new-releases",
  rank: 1,
  weight: 0,
  async plan() {
    // Los últimos `NEW_RELEASE_WINDOW_DAYS`, ordenados por la señal (popularidad del calendario si no hay
    // comunidad) y desempatados por el más reciente; las carátulas se resuelven al generar.
    const rows = await db
      .select({ id: releaseGroup.id })
      .from(releaseGroup)
      .where(
        and(
          sql`${releaseGroup.category} in ${NEW_RELEASE_CATEGORIES}`,
          sql`${releaseGroup.firstReleaseDate} between current_date - ${NEW_RELEASE_WINDOW_DAYS}::int and current_date`,
          coverResolvableCondition(),
        ),
      )
      .orderBy(...albumSignalOrder(desc(releaseGroup.firstReleaseDate)))
      .limit(CANDIDATE_POOL);
    if (rows.length === 0) return { skip: "No hay lanzamientos recientes en el catálogo" };
    return { periodKey: EVERGREEN, title: "Novedades esenciales", candidates: rows.map((row) => row.id) };
  },
};

const topRatedQuarter: CollectionTemplate = {
  key: "top-rated-quarter",
  rank: 7,
  weight: COMMUNITY_WEIGHT,
  async plan(now) {
    const since = quarterStartIso(now);
    const rows = await db
      .select({ id: releaseGroup.id })
      .from(rating)
      .innerJoin(releaseGroup, eq(releaseGroup.id, rating.releaseGroupId))
      .where(
        and(
          isNotNull(rating.releaseGroupId),
          isNotNull(releaseGroup.coverThumbUrl),
          gte(rating.createdAt, sql`${since}::timestamptz`),
        ),
      )
      .groupBy(releaseGroup.id)
      .having(sql`count(*) >= ${MIN_RATINGS_PER_ALBUM}`)
      .orderBy(sql`avg(${rating.stars}) desc`, sql`count(*) desc`, asc(releaseGroup.id))
      .limit(COLLECTION_SIZE);
    if (rows.length === 0) return { skip: `Ningún álbum reúne ${MIN_RATINGS_PER_ALBUM} valoraciones este trimestre` };
    return { periodKey: quarterPeriodKey(now), title: quarterTitle(now), candidates: rows.map((row) => row.id) };
  },
};

const onePerDecade: CollectionTemplate = {
  key: "one-per-decade",
  rank: 6,
  weight: 0,
  async plan(_now, { covers }) {
    // El mejor `studio` de cada década con año conocido según la señal; si el mejor no tiene carátula se
    // prueba el siguiente de esa década. Décadas descendentes.
    const rows = await db
      .select({
        id: releaseGroup.id,
        decade: sql<number>`(floor(${releaseGroup.firstReleaseYear} / 10) * 10)::int`,
      })
      .from(releaseGroup)
      .where(
        and(
          eq(releaseGroup.category, "studio"),
          isNotNull(releaseGroup.firstReleaseYear),
          coverResolvableCondition(),
        ),
      )
      .orderBy(...albumSignalOrder())
      .limit(3000);

    const byDecade = new Map<number, string[]>();
    for (const row of rows) {
      const decade = Number(row.decade);
      byDecade.set(decade, [...(byDecade.get(decade) ?? []), row.id]);
    }
    const candidates: string[] = [];
    for (const decade of [...byDecade.keys()].sort((a, b) => b - a)) {
      const pick = await covers.first(byDecade.get(decade)!.slice(0, 5));
      if (pick) candidates.push(pick);
    }
    if (candidates.length === 0) return { skip: "Ninguna década tiene un álbum con carátula" };
    return { periodKey: EVERGREEN, title: "Un disco por década", candidates };
  },
};

const mostReviewedMonth: CollectionTemplate = {
  key: "most-reviewed-month",
  rank: 8,
  weight: COMMUNITY_WEIGHT,
  async plan(now) {
    const since = monthStartIso(now);
    const rows = await db
      .select({ id: releaseGroup.id })
      .from(review)
      .innerJoin(releaseGroup, eq(releaseGroup.id, review.releaseGroupId))
      .where(
        and(
          isNotNull(review.releaseGroupId),
          isNotNull(releaseGroup.coverThumbUrl),
          eq(review.moderationStatus, "visible"),
          gte(review.createdAt, sql`${since}::timestamptz`),
        ),
      )
      .groupBy(releaseGroup.id)
      .orderBy(sql`count(*) desc`, asc(releaseGroup.id))
      .limit(COLLECTION_SIZE);
    if (rows.length === 0) return { skip: "Ningún álbum recibió reseñas este mes" };
    return { periodKey: monthPeriodKey(now), title: reviewedMonthTitle(now), candidates: rows.map((row) => row.id) };
  },
};

/** Registro de plantillas; el orden es el de ejecución (las seis del día 0 y las dos de comunidad). */
export const COLLECTION_TEMPLATES: readonly CollectionTemplate[] = [
  newReleases,
  grammyWinners,
  genreSpotlight,
  anniversaries,
  upcoming,
  onePerDecade,
  topRatedQuarter,
  mostReviewedMonth,
];

export function findTemplate(key: string): CollectionTemplate | undefined {
  return COLLECTION_TEMPLATES.find((template) => template.key === key);
}
