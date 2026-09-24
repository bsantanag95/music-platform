// Constantes, tipos y funciones puras de los agregados de comunidad de un álbum
// (openspec: redesign-album-page). Sin acceso a base de datos: los consumen tanto el
// servicio (`album-community.ts`) como los componentes de la cabecera.

/** Mínimo de valoraciones para mostrar media e histograma, y de personas para mostrar un conteo exacto. */
export const COMMUNITY_MIN_COUNT = 5;

/** Valores de estrellas posibles, de ½ a 5, en el orden del histograma. */
export const STAR_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

/**
 * Conteo de personas con umbral de anonimato: `exact` cuando es 0 o alcanza el mínimo;
 * `fewer` cuando es mayor que 0 y menor que el mínimo (la UI muestra "menos de 5").
 */
export type ThresholdedCount = { kind: "exact"; value: number } | { kind: "fewer"; threshold: number };

export interface AlbumRatingSummary {
  count: number;
  /** `null` por debajo del umbral. */
  averageStars: number | null;
  averageDetailedScore: number | null;
  /** Una cifra por valor de `STAR_VALUES`; `null` por debajo del umbral. */
  histogram: number[] | null;
}

export interface AlbumCommunityStats {
  ratings: AlbumRatingSummary;
  reviewCount: number;
  collectors: ThresholdedCount;
  seekers: ThresholdedCount;
  listCount: number;
}

export function thresholdCount(value: number, min = COMMUNITY_MIN_COUNT): ThresholdedCount {
  if (value > 0 && value < min) return { kind: "fewer", threshold: min };
  return { kind: "exact", value };
}

/** Arma el histograma completo (con ceros) a partir de las filas agrupadas por estrellas. */
export function buildHistogram(rows: { stars: string | number; n: number }[]): number[] {
  const byValue = new Map<number, number>();
  for (const row of rows) byValue.set(Number(row.stars), row.n);
  return STAR_VALUES.map((value) => byValue.get(value) ?? 0);
}

export function summarizeRatings(
  aggregate: { count: number; averageStars: number | null; averageDetailedScore: number | null },
  histogramRows: { stars: string | number; n: number }[],
  min = COMMUNITY_MIN_COUNT,
): AlbumRatingSummary {
  if (aggregate.count < min) {
    return { count: aggregate.count, averageStars: null, averageDetailedScore: null, histogram: null };
  }
  return {
    count: aggregate.count,
    averageStars: aggregate.averageStars,
    averageDetailedScore: aggregate.averageDetailedScore,
    histogram: buildHistogram(histogramRows),
  };
}

/** Reacciones "fuertes" que cuentan para la marca de favorita de la comunidad. */
export const STRONG_REACTIONS = ["loved", "obsessed"] as const;

/** Máximo de pistas marcadas como favoritas por álbum. */
export const MAX_COMMUNITY_FAVORITES = 3;

/**
 * Elige las favoritas de la comunidad: pistas con al menos `min` reacciones fuertes,
 * de mayor a menor, como máximo `max`. Desempate estable por id de grabación.
 */
export function pickCommunityFavorites(
  rows: { recordingId: string; n: number }[],
  min = COMMUNITY_MIN_COUNT,
  max = MAX_COMMUNITY_FAVORITES,
): Set<string> {
  const eligible = rows
    .filter((row) => row.n >= min)
    .sort((a, b) => b.n - a.n || a.recordingId.localeCompare(b.recordingId));
  return new Set(eligible.slice(0, max).map((row) => row.recordingId));
}

