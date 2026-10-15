import type { MessageParam, MessageRef } from "./types";

// Claves de mensaje que emiten los presentadores, dentro de `catalog.explore.collectionContext`. Una lista cerrada
// para que un error de tipeo falle al compilar y para que una prueba compruebe que cada clave existe en los dos
// idiomas (openspec: add-collection-presenters).
export const CONTEXT_MESSAGE_KEYS = [
  // Familias.
  "anniversary",
  "date",
  "year",
  // Premios.
  "awardsSummary",
  "awardsLink",
  "awardsWon1",
  "awardsWon2",
  "awardsWonMore",
  // Novedades esenciales.
  "newReleasesSummary",
  "newReleasesSummaryNoRange",
  "newReleasesToday",
  "newReleasesYesterday",
  "newReleasesDaysAgo",
  "newReleasesWeeksAgo",
  "monthHeading",
] as const;

export type ContextMessageKey = (typeof CONTEXT_MESSAGE_KEYS)[number];

/** Referencia a un mensaje del grupo `collectionContext`. */
export function ref(key: ContextMessageKey, params?: Record<string, MessageParam>): MessageRef {
  return params ? { key, params } : { key };
}
