import { albumReleaseDates } from "../../discovery";
import { ERA_YEARS } from "../../constants";
import { FAMILY_NAMES } from "../titles";
import { ref } from "./keys";
import { spotlightPeriod } from "./period";
import type { ReleaseDate } from "./families";
import { emptyContext, type CollectionContext, type CollectionPresenter } from "./types";

// Presentadores de "Para entrar a …" (`genre-spotlight`) y "Un disco por década" (`one-per-decade`; openspec:
// add-remaining-collection-presenters). Las dos colecciones se explican con una regla (un disco por era, un disco por
// década) y cada disco dice qué era o década representa. No agrupan: serían secciones de un solo disco.

const yearOf = (release: ReleaseDate | undefined): number | null =>
  release?.year ?? (release?.date ? Number(release.date.slice(0, 4)) : null);

/** Función pura: el contexto de un género por eras. `genre` es el nombre del género en los dos idiomas. */
export function buildGenreSpotlightContext(
  albumIds: string[],
  dates: Record<string, ReleaseDate>,
  genre: { es: string; en: string },
): CollectionContext {
  const context = emptyContext();
  context.summary = ref("genreSpotlightSummary", { era: ERA_YEARS, genre });
  for (const id of albumIds) {
    const year = yearOf(dates[id]);
    if (!year) continue;
    const from = Math.floor(year / ERA_YEARS) * ERA_YEARS;
    context.notes.set(id, ref("genreEra", { from: String(from), to: String(from + ERA_YEARS - 1), year: String(year) }));
  }
  return context;
}

/** Se abstiene si el período no trae una familia conocida del catálogo de géneros. */
export const genreSpotlightPresenter: CollectionPresenter = async ({ periodKey, albumIds }) => {
  const period = spotlightPeriod(periodKey);
  const es = period ? FAMILY_NAMES.es[period.family] : undefined;
  const en = period ? FAMILY_NAMES.en[period.family] : undefined;
  if (!es || !en) return null;
  return buildGenreSpotlightContext(albumIds, await albumReleaseDates(albumIds), { es, en });
};

/** Función pura: el contexto de un disco por década. */
export function buildOnePerDecadeContext(albumIds: string[], dates: Record<string, ReleaseDate>): CollectionContext {
  const context = emptyContext();
  context.summary = ref("decadeSummary");
  for (const id of albumIds) {
    const year = yearOf(dates[id]);
    if (!year) continue;
    const decade = Math.floor(year / 10) * 10;
    // Un disco de 2020 no necesita "Década de 2020 · 2020": cuando el año es el de la década, se dice una sola vez.
    context.notes.set(
      id,
      year === decade ? ref("decadeNoteExact", { decade: String(decade) }) : ref("decadeNote", { decade: String(decade), year: String(year) }),
    );
  }
  return context;
}

export const onePerDecadePresenter: CollectionPresenter = async ({ albumIds }) =>
  buildOnePerDecadeContext(albumIds, await albumReleaseDates(albumIds));
