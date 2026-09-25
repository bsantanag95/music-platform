// Tramo del puntaje detallado (1–100) que corresponde a una valoración en estrellas
// (openspec: rework-album-relation-panel, D3). Espejo del `CHECK` de `rating` en
// `drizzle/0000_initial.sql`: ½★ → 1–10, 1★ → 11–20 … 5★ → 91–100. El `CHECK` sigue siendo
// la fuente de verdad; esto solo permite a la UI no ofrecer valores que la base rechazaría.

export interface ScoreRange {
  min: number;
  max: number;
}

export function scoreRange(stars: number): ScoreRange {
  const steps = Math.round(stars * 2);
  return { min: (steps - 1) * 10 + 1, max: steps * 10 };
}

export function isScoreCoherent(stars: number, score: number | null): boolean {
  if (score === null) return true;
  const { min, max } = scoreRange(stars);
  return Number.isInteger(score) && score >= min && score <= max;
}
