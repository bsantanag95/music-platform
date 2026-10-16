// Presentadores de colección (openspec: add-collection-presenters, ADR 0039): cómo se explica cada colección generada
// en su detalle. El registro vive aparte de las plantillas (`COLLECTION_TEMPLATES`): la plantilla escribe y corre en la
// generación; el presentador lee y corre en la petición de la página. Una plantilla sin presentador cae al de su
// familia y, si tampoco, a un contexto vacío.

import { anniversariesPresenter } from "./anniversaries";
import { awardsPresenter } from "./awards";
import { genreSpotlightPresenter, onePerDecadePresenter } from "./eras";
import { FAMILY_PRESENTERS } from "./families";
import { newReleasesPresenter } from "./new-releases";
import { popularMonthPresenter, topRatedPresenter } from "./rankings";
import { upcomingPresenter } from "./upcoming";
import { resolveContext, type PresenterRegistry } from "./resolve";
import type { CollectionContext, PresenterInput } from "./types";

/** Presentadores propios, por `template_key`. Agregar uno es escribirlo y registrarlo aquí; la página no cambia. */
export const TEMPLATE_PRESENTERS: PresenterRegistry["byTemplate"] = {
  "grammy-winners": awardsPresenter,
  "new-releases": newReleasesPresenter,
  upcoming: upcomingPresenter,
  anniversaries: anniversariesPresenter,
  "genre-spotlight": genreSpotlightPresenter,
  "one-per-decade": onePerDecadePresenter,
  "top-rated-quarter": topRatedPresenter,
  "popular-month": popularMonthPresenter,
};

export const PRESENTER_REGISTRY: PresenterRegistry = { byTemplate: TEMPLATE_PRESENTERS, byFamily: FAMILY_PRESENTERS };

/** El contexto de una colección para su detalle: presentador de la plantilla → de la familia → vacío. */
export function presentCollection(input: PresenterInput): Promise<CollectionContext> {
  return resolveContext(PRESENTER_REGISTRY, input);
}

export type { CollectionContext, PresenterInput } from "./types";
