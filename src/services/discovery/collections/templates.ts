// Plantillas de las colecciones generadas de /explore (openspec: automate-explore-collections,
// ADR 0033). Cada plantilla es una regla: devuelve los ids de release_group de su colección, en
// orden. Solo usa datos del catálogo y de la comunidad propia (nunca afinidad personal).

import { and, asc, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { rating, releaseGroup, review } from "@/db/schema";
import { COLLECTION_SIZE, MIN_RATINGS_PER_ALBUM } from "../constants";
import { newReleasesCondition, newReleasesOrder } from "../discovery";

export interface CollectionTemplate {
  /** Clave estable (columna `template_key`). */
  key: string;
  /** Orden de desempate en el riel (`rank`): menor = antes. */
  rank: number;
  /** Clave del período vigente; `evergreen` si la lista es única y se refresca en el lugar. */
  periodKey(now: Date): string;
  /** Título de la lista; incluye el período cuando lo hay. */
  title(now: Date): string;
  /** Ids de release_group de la colección, en orden. Puede devolver menos del mínimo. */
  select(now: Date): Promise<string[]>;
}

export const EVERGREEN = "evergreen";

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function quarterOf(now: Date): number {
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

const newReleases: CollectionTemplate = {
  key: "new-releases",
  rank: 1,
  periodKey: () => EVERGREEN,
  title: () => "Novedades esenciales",
  async select() {
    const rows = await db
      .select({ id: releaseGroup.id })
      .from(releaseGroup)
      .where(newReleasesCondition())
      .orderBy(...newReleasesOrder())
      .limit(COLLECTION_SIZE);
    return rows.map((row) => row.id);
  },
};

const topRatedQuarter: CollectionTemplate = {
  key: "top-rated-quarter",
  rank: 2,
  periodKey: (now) => `${now.getUTCFullYear()}-Q${quarterOf(now)}`,
  title: (now) => `Mejor valorados del ${quarterOf(now)}.º trimestre de ${now.getUTCFullYear()}`,
  async select(now) {
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
    return rows.map((row) => row.id);
  },
};

const onePerDecade: CollectionTemplate = {
  key: "one-per-decade",
  rank: 3,
  periodKey: () => EVERGREEN,
  title: () => "Un disco por década",
  async select() {
    // El studio más temprano de cada década con año conocido y carátula, décadas descendentes.
    const rows = await db
      .select({
        id: releaseGroup.id,
        decade: sql<number>`(floor(${releaseGroup.firstReleaseYear} / 10) * 10)::int`,
        year: releaseGroup.firstReleaseYear,
      })
      .from(releaseGroup)
      .where(
        and(
          eq(releaseGroup.category, "studio"),
          isNotNull(releaseGroup.firstReleaseYear),
          isNotNull(releaseGroup.coverThumbUrl),
        ),
      )
      .orderBy(desc(releaseGroup.firstReleaseYear), asc(releaseGroup.id));
    const perDecade = new Map<number, { id: string; year: number }>();
    for (const row of rows) {
      const decade = Number(row.decade);
      const current = perDecade.get(decade);
      if (!current || Number(row.year) < current.year) {
        perDecade.set(decade, { id: row.id, year: Number(row.year) });
      }
    }
    return [...perDecade.entries()].sort((a, b) => b[0] - a[0]).map(([, value]) => value.id);
  },
};

const mostReviewedMonth: CollectionTemplate = {
  key: "most-reviewed-month",
  rank: 4,
  periodKey: (now) => `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
  title: (now) => `Lo más reseñado de ${MONTHS[now.getUTCMonth()]} de ${now.getUTCFullYear()}`,
  async select(now) {
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
    return rows.map((row) => row.id);
  },
};

/** Registro de plantillas; el orden es el de ejecución. */
export const COLLECTION_TEMPLATES: readonly CollectionTemplate[] = [
  newReleases,
  topRatedQuarter,
  onePerDecade,
  mostReviewedMonth,
];

export function findTemplate(key: string): CollectionTemplate | undefined {
  return COLLECTION_TEMPLATES.find((template) => template.key === key);
}
