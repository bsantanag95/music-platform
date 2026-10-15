import { albumReleaseDates } from "../../discovery";
import { ref } from "./keys";
import { countdownNote } from "./relative";
import type { ReleaseDate } from "./families";
import { emptyContext, type CollectionContext, type CollectionPresenter, type ContextGroup } from "./types";

// Presentador de Lo que viene (`upcoming`; openspec: add-remaining-collection-presenters): resumen con el rango real de
// fechas, cuenta regresiva por disco y los discos agrupados por mes, del más cercano al más lejano. No afirma una
// ventana de días: el calendario no tiene el mismo tope que el catálogo.

const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const fullDate = (release: ReleaseDate | undefined): string | null =>
  release?.date && FULL_DATE.test(release.date) ? release.date : null;

/** Función pura: el contexto de Lo que viene para los discos dados (en el orden de la lista) con sus fechas. */
export function buildUpcomingContext(albumIds: string[], dates: Record<string, ReleaseDate>, today: Date): CollectionContext {
  const context = emptyContext();
  const byMonth = new Map<string, string[]>();
  const full: string[] = [];

  for (const id of albumIds) {
    const date = fullDate(dates[id]);
    if (date) {
      full.push(date);
      context.notes.set(id, countdownNote(date, today));
      const month = date.slice(0, 7);
      byMonth.set(month, [...(byMonth.get(month) ?? []), id]);
    } else if (dates[id]?.year) {
      // El año va como texto: un número se formatearía con separador de miles.
      context.notes.set(id, ref("year", { year: String(dates[id]!.year) }));
    }
  }

  const ordered = [...full].sort();
  const from = ordered[0];
  const to = ordered.at(-1);
  context.summary =
    from && to && from !== to
      ? ref("upcomingSummary", { from: { date: from, style: "day-month" }, to: { date: to, style: "day-month" } })
      : ref("upcomingSummaryNoRange");

  // Del mes más cercano al más lejano: lo contrario que las novedades.
  const groups: ContextGroup[] = [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, ids]) => ({
      label: ref("monthHeading", { month: { date: `${month}-01`, style: "month-year" } }),
      albumIds: ids,
    }));
  if (groups.length > 0) context.groups = groups;
  return context;
}

export const upcomingPresenter: CollectionPresenter = async ({ albumIds, today }) =>
  buildUpcomingContext(albumIds, await albumReleaseDates(albumIds), today);
