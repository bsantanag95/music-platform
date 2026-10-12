// Plantillas del día 0 (openspec: add-day-zero-collections, ADR 0035): no dependen de la comunidad, solo de
// premios, calendario de lanzamientos, fechas y géneros del catálogo.

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { releaseCalendarEntry, releaseGroup } from "@/db/schema";
import { albumInFamily } from "@/services/genres/read";
import { GENRE_FAMILIES, type FamilyKey } from "@/services/genres/families";
import esCatalog from "../../../../messages/es/catalog.json";
import {
  CANDIDATE_POOL,
  COLLECTION_SIZE,
  ERA_YEARS,
  MIN_ALBUMS_FOR_SECTION,
  NEW_RELEASE_CATEGORIES,
  UPCOMING_WINDOW_DAYS,
} from "../constants";
import { EVERGREEN, MONTHS, eraOf, isoWeekKey, monthKey, sampleEvenly, weekNumber } from "./periods";
import { albumSignalOrder, coverResolvableCondition } from "./signal";
import type { CollectionTemplate } from "./types";

/** Nombre del premio para el título ("Ganadores del Grammy 2025"). */
const AWARD_NAMES: Record<string, string> = { grammy: "Grammy" };

interface CeremonyRow {
  slug: string;
  year: number;
  ceremony_id: string;
}

export const grammyWinners: CollectionTemplate = {
  key: "grammy-winners",
  rank: 2,
  weight: 0,
  async plan() {
    const [ceremony] = await db.execute<CeremonyRow & Record<string, unknown>>(sql`
      select a.slug, c.year::int as year, c.id as ceremony_id
      from award_ceremony c join award a on a.id = c.award_id
      order by c.held_on desc limit 1
    `);
    if (!ceremony) return { skip: "No hay ceremonias de premios cargadas (scripts/load-awards.ts)" };

    // Ganadores con álbum (directo o disco ancla de la grabación): categorías generales primero.
    const rows = await db.execute<{ rg_id: string } & Record<string, unknown>>(sql`
      select coalesce(n.release_group_id, n.anchor_release_group_id) as rg_id
      from award_nomination n
      join award_category_edition e on e.id = n.category_edition_id
      join award_category cat on cat.id = e.category_id
      where e.ceremony_id = ${ceremony.ceremony_id}
        and n.won
        and coalesce(n.release_group_id, n.anchor_release_group_id) is not null
      order by (cat.tier = 'general') desc, cat.key, n.sort_order
    `);
    const candidates = [...new Set([...rows].map((row) => row.rg_id))];
    if (candidates.length === 0) return { skip: `La ceremonia ${ceremony.year} no tiene ganadores con álbum` };

    const name = AWARD_NAMES[ceremony.slug] ?? ceremony.slug;
    return { periodKey: `${ceremony.slug}-${ceremony.year}`, title: `Ganadores del ${name} ${ceremony.year}`, candidates };
  },
};

export const anniversaries: CollectionTemplate = {
  key: "anniversaries",
  rank: 4,
  weight: 0,
  async plan(now, { covers }) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const years = sql`(${year}::int - extract(year from ${releaseGroup.firstReleaseDate})::int)`;

    async function candidatesFor(roundOnly: boolean): Promise<string[]> {
      const rows = await db
        .select({ id: releaseGroup.id })
        .from(releaseGroup)
        .where(
          and(
            eq(releaseGroup.category, "studio"),
            sql`${releaseGroup.firstReleaseDate} is not null`,
            sql`extract(month from ${releaseGroup.firstReleaseDate}) = ${month}`,
            sql`${years} >= 10`,
            roundOnly ? sql`${years} % 5 = 0` : undefined,
            coverResolvableCondition(),
          ),
        )
        .orderBy(sql`${years} desc`, ...albumSignalOrder())
        .limit(CANDIDATE_POOL);
      return rows.map((row) => row.id);
    }

    // Aniversarios redondos (múltiplos de 5); si no alcanzan, cualquier aniversario de 10 años o más.
    let picked = await covers.take(await candidatesFor(true), COLLECTION_SIZE);
    if (picked.length < MIN_ALBUMS_FOR_SECTION) picked = await covers.take(await candidatesFor(false), COLLECTION_SIZE);
    if (picked.length === 0) return { skip: `Ningún estudio con carátula cumple 10 años o más en ${MONTHS[month - 1]}` };
    return { periodKey: monthKey(now), title: `Cumplen años en ${MONTHS[month - 1]}`, candidates: picked };
  },
};

const FAMILY_NAMES = esCatalog.genres.families as Record<string, string>;

/** Familias en el orden de la taxonomía, rotadas para que `weekNumber` elija la primera. */
export function familiesFromWeek(now: Date): FamilyKey[] {
  const keys = GENRE_FAMILIES.map((family) => family.key);
  const start = weekNumber(now) % keys.length;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

export const genreSpotlight: CollectionTemplate = {
  key: "genre-spotlight",
  rank: 3,
  weight: 0,
  async plan(now, { covers }) {
    const week = isoWeekKey(now);
    for (const family of familiesFromWeek(now)) {
      const rows = await db
        .select({ id: releaseGroup.id, year: releaseGroup.firstReleaseYear })
        .from(releaseGroup)
        .where(
          and(
            eq(releaseGroup.category, "studio"),
            sql`${releaseGroup.firstReleaseYear} is not null`,
            albumInFamily(family),
            coverResolvableCondition(),
          ),
        )
        .orderBy(...albumSignalOrder())
        .limit(800);

      const byEra = new Map<number, string[]>();
      for (const row of rows) {
        const era = eraOf(Number(row.year), ERA_YEARS);
        byEra.set(era, [...(byEra.get(era) ?? []), row.id]);
      }
      // Barato primero: una familia con pocas eras no vale ninguna petición de carátulas.
      if (byEra.size < MIN_ALBUMS_FOR_SECTION) continue;

      const picks: string[] = [];
      for (const era of [...byEra.keys()].sort((a, b) => a - b)) {
        const pick = await covers.first(byEra.get(era)!.slice(0, 4));
        if (pick) picks.push(pick);
      }
      if (picks.length < MIN_ALBUMS_FOR_SECTION) continue;

      return {
        periodKey: `${week}-${family}`,
        title: `Para entrar a ${FAMILY_NAMES[family] ?? family}`,
        candidates: sampleEvenly(picks, COLLECTION_SIZE),
      };
    }
    return { skip: `Ninguna familia de géneros reúne ${MIN_ALBUMS_FOR_SECTION} eras con carátula` };
  },
};

export const upcoming: CollectionTemplate = {
  key: "upcoming",
  rank: 5,
  weight: 0,
  async plan(_now, { covers }) {
    // Primero lo del calendario enlazado al catálogo, por rango de popularidad; después, los próximos del catálogo.
    const fromCalendar = await db
      .select({ id: releaseGroup.id })
      .from(releaseCalendarEntry)
      .innerJoin(releaseGroup, eq(releaseGroup.id, releaseCalendarEntry.releaseGroupId))
      .where(
        and(
          sql`${releaseCalendarEntry.releaseDate} > current_date`,
          isNull(releaseCalendarEntry.exclusion),
          coverResolvableCondition(),
        ),
      )
      .orderBy(sql`${releaseCalendarEntry.anonymousRank} asc nulls last`, asc(releaseCalendarEntry.releaseDate), asc(releaseGroup.id))
      .limit(CANDIDATE_POOL);

    const fromCatalog = await db
      .select({ id: releaseGroup.id })
      .from(releaseGroup)
      .where(
        and(
          sql`${releaseGroup.category} in ${NEW_RELEASE_CATEGORIES}`,
          sql`${releaseGroup.firstReleaseDate} > current_date`,
          sql`${releaseGroup.firstReleaseDate} <= current_date + ${UPCOMING_WINDOW_DAYS}::int`,
          coverResolvableCondition(),
        ),
      )
      .orderBy(asc(releaseGroup.firstReleaseDate), asc(releaseGroup.id))
      .limit(CANDIDATE_POOL);

    const ids = [...new Set([...fromCalendar, ...fromCatalog].map((row) => row.id))];
    if (ids.length === 0) return { skip: "El calendario y el catálogo no tienen próximos lanzamientos con carátula" };
    return { periodKey: EVERGREEN, title: "Lo que viene", candidates: await covers.take(ids, COLLECTION_SIZE) };
  },
};
