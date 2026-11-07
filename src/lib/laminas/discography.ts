// Reglas puras de la Lámina de discografía (spec discography-laminas), compartidas por la página y la imagen.

/** Desde cuántos discos valorados existe una discografía. */
export const DISCOGRAPHY_MIN_DISCS = 3;

/**
 * D9 (docs/05-features/sharing.md §8): la vista Por canción se ofrece desde 10 canciones valoradas repartidas en al menos 2 discos.
 * Sin datos reales para afinarlo: con menos, la grilla queda casi vacía y se lee como un error.
 */
export const DISCOGRAPHY_SONG_MIN = 10;
export const DISCOGRAPHY_SONG_MIN_DISCS = 2;

/** Desde cuántas canciones valoradas existe la Lámina de un álbum. */
export const DISCOGRAPHY_ALBUM_MIN_SONGS = 3;

/** Secciones que el dueño puede sumar a la principal; los EP ya están en ella. */
export const DISCOGRAPHY_EXTRA_SECTIONS = ["live", "compilations"] as const;
export type DiscographyExtraSection = (typeof DISCOGRAPHY_EXTRA_SECTIONS)[number];

export const DISCOGRAPHY_VIEWS = ["disc", "song"] as const;
export type DiscographyView = (typeof DISCOGRAPHY_VIEWS)[number];

/** ¿Alcanza para la vista Por canción? Cuenta canciones distintas y discos con alguna. */
export function songViewAvailable(discs: ReadonlyArray<{ tracks: ReadonlyArray<{ recordingId: string; score: unknown }> }>): boolean {
  const songs = new Set<string>();
  let discsWithSongs = 0;
  for (const disc of discs) {
    const rated = disc.tracks.filter((track) => track.score !== null);
    if (rated.length > 0) discsWithSongs += 1;
    for (const track of rated) songs.add(track.recordingId);
  }
  return songs.size >= DISCOGRAPHY_SONG_MIN && discsWithSongs >= DISCOGRAPHY_SONG_MIN_DISCS;
}

/** Vista que se muestra: la pedida o la del dueño, si está disponible; si no, la otra. */
export function effectiveView(requested: DiscographyView, available: Record<DiscographyView, boolean>): DiscographyView {
  if (available[requested]) return requested;
  return requested === "song" ? "disc" : available.song ? "song" : "disc";
}

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
