import { albumReleaseDates } from "../../discovery";
import type { CollectionFamily } from "../families";
import { ref } from "./keys";
import { emptyContext, type CollectionPresenter, type MessageRef } from "./types";

// Presentadores de familia (openspec: add-collection-presenters): la cartela de respaldo de toda plantilla que no
// tiene presentador propio. Reproducen lo que el detalle mostraba por familia antes de que existieran los
// presentadores: efemérides → aniversario, lanzamientos → fecha, el resto → año de lanzamiento.

export interface ReleaseDate {
  date: string | null;
  year: number | null;
}

/**
 * - Efemérides con fecha completa: el aniversario que cumple en el año de hoy ("Cumple 70 años · 15 oct 1956"). Sin
 *   fecha completa, o sin años cumplidos, no hay aniversario que decir y cae al año.
 * - Lanzamientos con fecha completa: la fecha (es lo que ordena lo nuevo y lo que viene).
 * - El resto: el año de lanzamiento.
 * `null` sin fecha ni año.
 */
export function familyNote(family: CollectionFamily, release: ReleaseDate | undefined, today: Date): MessageRef | null {
  if (!release) return null;
  const full = release.date && /^\d{4}-\d{2}-\d{2}$/.test(release.date) ? release.date : null;
  if (family === "ephemeris" && full) {
    const years = today.getUTCFullYear() - Number(full.slice(0, 4));
    if (years > 0) return ref("anniversary", { years, date: { date: full, style: "short" } });
  }
  if (family === "releases" && full) return ref("date", { date: { date: full, style: "short" } });
  const year = release.year ?? (release.date ? Number(release.date.slice(0, 4)) : null);
  // El año va como texto: un número se formatearía con separador de miles ("2.024").
  return year ? ref("year", { year: String(year) }) : null;
}

function presenterFor(family: CollectionFamily, numbered: boolean): CollectionPresenter {
  return async ({ albumIds, today }) => {
    const dates = await albumReleaseDates(albumIds);
    const context = emptyContext();
    context.numbered = numbered;
    for (const id of albumIds) {
      const note = familyNote(family, dates[id], today);
      if (note) context.notes.set(id, note);
    }
    return context;
  };
}

/** Un presentador por familia; solo `rankings` numera los discos (su orden es un ranking). */
export const FAMILY_PRESENTERS: Record<CollectionFamily, CollectionPresenter> = {
  ephemeris: presenterFor("ephemeris", false),
  awards: presenterFor("awards", false),
  releases: presenterFor("releases", false),
  discovery: presenterFor("discovery", false),
  rankings: presenterFor("rankings", true),
};
