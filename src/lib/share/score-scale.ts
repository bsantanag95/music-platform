import { BRAND_COLORS } from "./brand-tokens";

// Escala de la casa (docs/05-features/sharing.md §5.3, spec share-images): una sola escala de color para la
// nota 1–100 en todas las imágenes. Los tramos siguen los rangos de 10 puntos de las estrellas, así que una
// valoración solo con estrellas cae en su tramo sin inventar un número. Solo 91–100 usa el dorado de la
// marca (The Rarity Rule, DESIGN.md). El contraste número/fondo de cada tramo es ≥ 4.5:1
// (score-scale.test.ts).

export interface ScoreBand {
  /** Nota mínima del tramo (1–100), inclusive. */
  min: number;
  /** Nota máxima del tramo, inclusive. */
  max: number;
  /** Estrellas equivalentes al tramo, para la leyenda. */
  stars: string;
  background: string;
  foreground: string;
}

export const SCORE_BANDS: readonly ScoreBand[] = [
  { min: 91, max: 100, stars: "5★", background: BRAND_COLORS.amber, foreground: BRAND_COLORS.ink },
  { min: 81, max: 90, stars: "4.5★", background: "#b8955a", foreground: BRAND_COLORS.ink },
  { min: 71, max: 80, stars: "4★", background: "#8a7f6c", foreground: BRAND_COLORS.ink },
  { min: 61, max: 70, stars: "3.5★", background: "#3f6d6d", foreground: BRAND_COLORS.paper },
  { min: 41, max: 60, stars: "2.5–3★", background: "#2f4f51", foreground: BRAND_COLORS.paper },
  { min: 1, max: 40, stars: "≤2★", background: "#8f4a42", foreground: BRAND_COLORS.paper },
];

/** Valoración tal como la dio la persona: estrellas siempre, nota detallada opcional. */
export interface ScoreValue {
  stars: number;
  detailedScore: number | null;
}

export interface ScaledScore {
  band: ScoreBand;
  /** Texto a mostrar: el número si hay nota detallada, las estrellas si no. Nunca un número derivado. */
  label: string;
}

/** Tramo de una nota 1–100. */
export function bandForDetailed(score: number): ScoreBand {
  const band = SCORE_BANDS.find((b) => score >= b.min && score <= b.max);
  if (!band) throw new RangeError(`Nota fuera de la escala 1–100: ${score}`);
  return band;
}

/**
 * Tramo de una valoración solo con estrellas: el rango de 10 puntos de esas estrellas (4.5★ → 81–90) cae
 * siempre dentro de un único tramo.
 */
export function bandForStars(stars: number): ScoreBand {
  return bandForDetailed(Math.round(stars * 20));
}

export function scaleScore(value: ScoreValue): ScaledScore {
  if (value.detailedScore !== null) {
    return { band: bandForDetailed(value.detailedScore), label: String(value.detailedScore) };
  }
  return { band: bandForStars(value.stars), label: `${formatStars(value.stars)}★` };
}

/** Rango numérico del tramo para la leyenda ("91–100"): rangos, nunca adjetivos. */
export function bandRangeLabel(band: ScoreBand): string {
  return `${band.min}–${band.max}`;
}

function formatStars(stars: number): string {
  return Number.isInteger(stars) ? String(stars) : stars.toFixed(1);
}
