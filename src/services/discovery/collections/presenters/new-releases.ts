import { albumReleaseDates } from "../../discovery";
import { NEW_RELEASE_WINDOW_DAYS } from "../../constants";
import { ref } from "./keys";
import type { ReleaseDate } from "./families";
import { emptyContext, type CollectionContext, type CollectionPresenter, type ContextGroup, type MessageRef } from "./types";

// Presentador de Novedades esenciales (`new-releases`; openspec: add-collection-presenters) y prueba del contrato: un
// resumen con el rango real de lo que muestra, una cartela relativa a hoy y los discos agrupados por mes.

const DAY_MS = 24 * 60 * 60 * 1000;
const FULL_DATE = /^\d{4}-\d{2}-\d{2}$/;

const fullDate = (release: ReleaseDate | undefined): string | null =>
  release?.date && FULL_DATE.test(release.date) ? release.date : null;

/** Días enteros entre una fecha y hoy, ambos en UTC (negativo si la fecha es futura). */
function daysSince(isoDate: string, today: Date): number {
  const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((startOfToday - Date.parse(`${isoDate}T00:00:00Z`)) / DAY_MS);
}

/** "Hoy", "Ayer", "Hace 5 días · 9 oct", "Hace 3 semanas · 22 sep"; una fecha futura cae a la fecha sola. */
export function relativeNote(isoDate: string, today: Date): MessageRef {
  const days = daysSince(isoDate, today);
  if (days < 0) return ref("date", { date: { date: isoDate, style: "short" } });
  if (days === 0) return ref("newReleasesToday");
  if (days === 1) return ref("newReleasesYesterday");
  const date = { date: isoDate, style: "day-month" as const };
  if (days < 7) return ref("newReleasesDaysAgo", { days, date });
  return ref("newReleasesWeeksAgo", { weeks: Math.floor(days / 7), date });
}

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
