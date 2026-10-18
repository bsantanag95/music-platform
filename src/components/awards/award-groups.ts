// Agrupación de las tarjetas del hub `/awards` por tipo de premio (openspec: enrich-awards-hub). Preparada pero apagada:
// con cinco premios una sola grilla se recorre de un vistazo y los grupos dejarían secciones de una o dos tarjetas. Se
// enciende con `GROUP_AWARDS_ON_HUB` cuando el número de premios lo pida (como referencia, desde unos nueve).

export const GROUP_AWARDS_ON_HUB = false;

/** Grupos en su orden de presentación. `other` recoge los premios que todavía no tienen grupo asignado. */
export const AWARD_GROUPS = ["general", "latin", "critics", "other"] as const;
export type AwardGroup = (typeof AWARD_GROUPS)[number];

/**
 * Grupo de cada premio cargado: los generales de la industria (Grammy, Brit), los de música latina (Latin Grammy, Lo
 * Nuestro) y los de crítica o jurado (Mercury). Un premio nuevo sin entrada cae en `other` hasta que se le asigne uno.
 */
const GROUP_BY_AWARD: Record<string, AwardGroup> = {
  grammy: "general",
  "brit-awards": "general",
  "latin-grammy": "latin",
  "lo-nuestro": "latin",
  "mercury-prize": "critics",
};

export function awardGroup(awardSlug: string): AwardGroup {
  return GROUP_BY_AWARD[awardSlug] ?? "other";
}

/** Reparte los premios en grupos (en el orden de `AWARD_GROUPS`), conservando el orden recibido dentro de cada uno; sin grupos vacíos. */
export function groupAwards<T extends { awardSlug: string }>(awards: T[]): { group: AwardGroup; awards: T[] }[] {
  return AWARD_GROUPS.map((group) => ({ group, awards: awards.filter((a) => awardGroup(a.awardSlug) === group) })).filter(
    (entry) => entry.awards.length > 0,
  );
}
