// Reglas puras de la Lámina de discografía (spec discography-laminas), compartidas por la página y la imagen.

/** Desde cuántos discos valorados existe una discografía. */
export const DISCOGRAPHY_MIN_DISCS = 3;

export interface DiscographyScore {
  stars: number;
  detailedScore: number | null;
}

/** Posición en una escala de 100, solo para ubicar un disco: la etiqueta siempre muestra el dato real. */
export function discographyValue({ stars, detailedScore }: DiscographyScore): number {
  return detailedScore ?? stars * 20;
}

export interface CurvePoint {
  x: number;
  y: number;
  index: number;
}

/** Puntos de la curva de la carrera, repartidos a lo ancho. Un disco sin año no tiene lugar en el tiempo y queda afuera. */
export function curvePoints(
  discs: ReadonlyArray<DiscographyScore & { year: number | null }>,
  width: number,
  height: number,
  padding = 10,
): CurvePoint[] {
  const dated = discs.flatMap((disc, index) => (disc.year === null ? [] : [{ disc, index }]));
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  return dated.map(({ disc, index }, position) => ({
    x: padding + (dated.length === 1 ? usableWidth / 2 : (usableWidth * position) / (dated.length - 1)),
    y: padding + usableHeight * (1 - discographyValue(disc) / 100),
    index,
  }));
}
