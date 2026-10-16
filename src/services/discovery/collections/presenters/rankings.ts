import { MIN_RATINGS_PER_ALBUM, POPULARITY_FIGURE_MIN } from "../../constants";
import { ref } from "./keys";
import { firstOfMonth, monthPeriod, quarterPeriod } from "./period";
import { ratingStats, type RatingStat } from "./ranking-stats";
import { popularPeopleOf } from "../../popularity";
import { emptyContext, type CollectionContext, type CollectionPresenter } from "./types";

// Presentadores de los rankings de la comunidad (`top-rated-quarter` y `popular-month`; openspec:
// add-remaining-collection-presenters): cada disco dice la cifra que lo ubicó en el ranking, del período del propio
// ranking, y los discos se numeran porque su orden ES un ranking.

/** Función pura: el contexto de "Mejor valorados del trimestre". */
export function buildTopRatedContext(
  albumIds: string[],
  stats: Map<string, RatingStat>,
  period: { year: number; quarter: number },
): CollectionContext {
  const context = emptyContext();
  context.numbered = true;
  context.summary = ref("topRatedSummary", {
    quarter: String(period.quarter),
    year: String(period.year),
    min: MIN_RATINGS_PER_ALBUM,
  });
  for (const id of albumIds) {
    const stat = stats.get(id);
    if (stat && stat.count > 0) context.notes.set(id, ref("topRatedNote", { average: stat.average, count: stat.count }));
  }
  return context;
}

/** Se abstiene si el período no es `AAAA-Qn`. */
export const topRatedPresenter: CollectionPresenter = async ({ periodKey, albumIds }) => {
  const period = quarterPeriod(periodKey);
  if (!period) return null;
  return buildTopRatedContext(albumIds, await ratingStats(albumIds, period.bounds), period);
};

/** Función pura: el contexto de "Lo más popular del mes". La cifra solo desde `POPULARITY_FIGURE_MIN` personas. */
export function buildPopularMonthContext(
  albumIds: string[],
  people: Map<string, number>,
  period: { year: number; month: number },
): CollectionContext {
  const context = emptyContext();
  context.numbered = true;
  context.summary = ref("popularMonthSummary", {
    month: { date: firstOfMonth(period.year, period.month), style: "month-year-inline" },
  });
  for (const id of albumIds) {
    const count = people.get(id);
    if (count && count >= POPULARITY_FIGURE_MIN) context.notes.set(id, ref("popularMonthNote", { count }));
  }
  return context;
}

/** Se abstiene si el período no es `AAAA-MM`. Las personas, en una sola consulta para todos los discos. */
export const popularMonthPresenter: CollectionPresenter = async ({ periodKey, albumIds }) => {
  const period = monthPeriod(periodKey);
  if (!period) return null;
  return buildPopularMonthContext(albumIds, await popularPeopleOf(albumIds, period.bounds), period);
};
