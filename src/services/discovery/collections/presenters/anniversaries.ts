import { albumReleaseDates } from "../../discovery";
import { ref } from "./keys";
import { firstOfMonth, monthPeriod } from "./period";
import type { ReleaseDate } from "./families";
import { emptyContext, type CollectionContext, type CollectionPresenter } from "./types";

// Presentador de aniversarios (`anniversaries`; openspec: add-remaining-collection-presenters): el resumen nombra el
// mes de la colección y el rango de años que cumplen sus discos, y cada disco dice la edad que cumple en el AÑO DE SU
// PERÍODO, no en el de hoy: una colección archivada dice la edad que tenía entonces.

const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Función pura: el contexto de aniversarios para el período `{ year, month }` y los discos dados. */
export function buildAnniversariesContext(
  albumIds: string[],
  dates: Record<string, ReleaseDate>,
  period: { year: number; month: number },
): CollectionContext {
  const context = emptyContext();
  const ages: number[] = [];

  for (const id of albumIds) {
    const release = dates[id];
    const full = release?.date && FULL_DATE.test(release.date) ? release.date : null;
    const years = full ? period.year - Number(full.slice(0, 4)) : 0;
    if (full && years > 0) {
      ages.push(years);
      context.notes.set(id, ref("anniversary", { years, date: { date: full, style: "short" } }));
    } else if (release?.year) {
      // Sin fecha completa, o sin años cumplidos, no hay aniversario que decir: el año de lanzamiento.
      context.notes.set(id, ref("year", { year: String(release.year) }));
    }
  }

  if (ages.length > 0) {
    const month = { date: firstOfMonth(period.year, period.month), style: "month-year-inline" as const };
    const from = Math.min(...ages);
    const to = Math.max(...ages);
    context.summary =
      from === to
        ? ref("anniversariesSummarySingle", { years: from, month })
        : ref("anniversariesSummary", { month, from, to });
  }
  return context;
}

/** Se abstiene si el período no es `AAAA-MM`: la familia presenta en su lugar. */
export const anniversariesPresenter: CollectionPresenter = async ({ periodKey, albumIds }) => {
  const period = monthPeriod(periodKey);
  if (!period) return null;
  return buildAnniversariesContext(albumIds, await albumReleaseDates(albumIds), period);
};
