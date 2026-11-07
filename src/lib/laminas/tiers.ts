import { SCORE_BANDS, scaleScore, type ScoreBand, type ScoreValue } from "@/lib/share/score-scale";

// Tier list (openspec: add-tier-list-lamina-phase1, docs/05-features/sharing.md §4.3 y §5.3): los seis niveles son los seis
// tramos de la escala de la casa, en el mismo orden. Sirve al servidor, al editor y a la imagen.

export const TIER_COUNT = 6;

/** Etiquetas por defecto, de S a E. Editables; el color de cada nivel no cambia con la etiqueta. */
export const DEFAULT_TIER_LABELS = ["S", "A", "B", "C", "D", "E"] as const;

/** Largo máximo de una etiqueta (la base lo repite con `fn_tier_labels_valid`). */
export const TIER_LABEL_MAX = 12;

/** Discos por tier list, contando la bandeja. */
export const TIER_LIST_MAX_ITEMS = 50;

/** Tramo de la escala de cada nivel: da su color. */
export function tierBand(tier: number): ScoreBand {
  const band = SCORE_BANDS[tier];
  if (!band) throw new RangeError(`Nivel fuera de rango: ${tier}`);
  return band;
}

/** Nivel de una valoración: el de su tramo (la nota detallada si existe; si no, el tramo de sus estrellas). */
export function tierForScore(value: ScoreValue): number {
  return SCORE_BANDS.indexOf(scaleScore(value).band);
}
