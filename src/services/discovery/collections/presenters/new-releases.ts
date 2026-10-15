import { albumReleaseDates } from "../../discovery";
import { NEW_RELEASE_WINDOW_DAYS } from "../../constants";
import { ref } from "./keys";
import { relativeNote } from "./relative";
import type { ReleaseDate } from "./families";
import { emptyContext, type CollectionContext, type CollectionPresenter, type ContextGroup } from "./types";

// Presentador de Novedades esenciales (`new-releases`; openspec: add-collection-presenters) y prueba del contrato: un
// resumen con el rango real de lo que muestra, una cartela relativa a hoy y los discos agrupados por mes.

const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;

const fullDate = (release: ReleaseDate | undefined): string | null =>
  release?.date && FULL_DATE.test(release.date) ? release.date : null;

/**
 * Función pura: el contexto de Novedades para los discos dados (en el orden de la lista) con sus fechas. El rango del
 * resumen sale de los discos que se muestran, no de la ventana teórica: la colección se genera una vez por semana y
 * el rango real puede ser más corto. Los discos sin fecha completa dan su año y quedan fuera de los meses (el
 * registro los manda al grupo final sin encabezado).
 */
export function buildNewReleasesContext(
  albumIds: string[],
  dates: Record<string, ReleaseDate>,
  today: Date,
): CollectionContext {
  const context = emptyContext();
  const byMonth = new Map<string, string[]>();
  const full: string[] = [];

  for (const id of albumIds) {
    const date = fullDate(dates[id]);
    if (date) {
      full.push(date);
      context.notes.set(id, relativeNote(date, today));
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
      ? ref("newReleasesSummary", {
          days: NEW_RELEASE_WINDOW_DAYS,
          from: { date: from, style: "day-month" },
          to: { date: to, style: "day-month" },
        })
      : ref("newReleasesSummaryNoRange", { days: NEW_RELEASE_WINDOW_DAYS });

  const groups: ContextGroup[] = [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([month, ids]) => ({
      label: ref("monthHeading", { month: { date: `${month}-01`, style: "month-year" } }),
      albumIds: ids,
    }));
  if (groups.length > 0) context.groups = groups;
  return context;
}

export const newReleasesPresenter: CollectionPresenter = async ({ albumIds, today }) =>
  buildNewReleasesContext(albumIds, await albumReleaseDates(albumIds), today);
