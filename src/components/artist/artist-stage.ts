// Portada de la página de artista (openspec: modernize-artist-page-phase1, design «Fondo de la portada»): el fondo sale
// siempre de las carátulas de la discografía principal y el retrato de la foto, con respaldos. Funciones puras: el
// componente `ArtistStage` solo pinta lo que deciden.

/** Carátula de un disco de la discografía principal, en miniatura de 250 px. */
export interface StageCover {
  id: string;
  title: string;
  year: number | null;
  thumbUrl: string;
}

export type StageMode = "wall" | "fan" | "none";

/** Desde cuántas carátulas el fondo es un muro: con menos, un muro de 9 columnas repetiría discos en la misma fila. */
export const WALL_MIN = 8;
/** Fundas que caben en el abanico. */
export const FAN_MAX = 5;
/** Carátulas distintas que usa el muro como mucho. */
export const WALL_DISTINCT_MAX = 24;
/** Celdas del muro: 9 columnas × 5 filas en escritorio, 5 × 9 en el teléfono. */
export const WALL_CELLS = 45;

interface DiscographyLike {
  sections: { key: string; items: { id: string; title: string; year: number | null; coverThumbUrl: string | null; coverResolved: boolean }[] }[];
}

/** Carátulas de la discografía principal con imagen, en el orden de la discografía y sin repetir disco. */
export function stageCovers(discography: DiscographyLike | null): StageCover[] {
  const main = discography?.sections.find((section) => section.key === "main")?.items ?? [];
  const seen = new Set<string>();
  const covers: StageCover[] = [];
  for (const item of main) {
    if (!item.coverResolved || !item.coverThumbUrl || seen.has(item.id)) continue;
    seen.add(item.id);
    covers.push({ id: item.id, title: item.title, year: item.year, thumbUrl: item.coverThumbUrl });
  }
  return covers;
}

export interface StageBackdrop {
  mode: StageMode;
  /** Muro: las carátulas distintas que se repiten; abanico: las fundas de la más reciente a la más antigua; sin carátulas: vacío. */
  covers: StageCover[];
}

/** Del disco más reciente al más antiguo; los que no tienen año, al final en su orden. */
export function newestFirst(covers: StageCover[]): StageCover[] {
  const dated = covers.filter((cover) => cover.year !== null).reverse();
  return [...dated, ...covers.filter((cover) => cover.year === null)];
}

export function stageBackdrop(covers: StageCover[]): StageBackdrop {
  if (covers.length >= WALL_MIN) return { mode: "wall", covers: covers.slice(0, WALL_DISTINCT_MAX) };
  // En el abanico manda el último trabajo: va al frente y su color tiñe el fondo.
  if (covers.length >= 1) return { mode: "fan", covers: newestFirst(covers).slice(0, FAN_MAX) };
  return { mode: "none", covers: [] };
}

/** Celdas del muro: las carátulas repetidas en ciclo hasta llenar todas. */
export function wallCells(covers: StageCover[], cells = WALL_CELLS): StageCover[] {
  if (covers.length === 0) return [];
  return Array.from({ length: cells }, (_, index) => covers[index % covers.length]!);
}

/** Posición de cada funda del abanico: separación horizontal (%) y giro (grados). */
export function fanLayout(count: number): { left: number; rotate: number }[] {
  if (count <= 0) return [];
  if (count === 1) return [{ left: 0, rotate: -2 }];
  return Array.from({ length: count }, (_, index) => ({
    left: (index * (100 - 59)) / (count - 1),
    rotate: (index - (count - 1) / 2) * 3,
  }));
}

export type StagePortrait = { kind: "photo" } | { kind: "cover"; cover: StageCover } | { kind: "initials"; initials: string };

/** Iniciales del nombre: la primera letra de las dos primeras palabras (o la primera de una sola). */
export function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+/u, ""))
    .filter(Boolean);
  const letters = words.slice(0, 2).map((word) => Array.from(word)[0]!.toLocaleUpperCase());
  return letters.join("") || "?";
}

/**
 * Retrato: la foto; sin foto, la carátula del disco mejor valorado o, si no lo hay, la del disco principal más reciente
 * con año; sin carátulas, las iniciales.
 */
export function stagePortrait(hasPhoto: boolean, covers: StageCover[], bestRatedId: string | null, name: string): StagePortrait {
  if (hasPhoto) return { kind: "photo" };
  const best = bestRatedId ? covers.find((cover) => cover.id === bestRatedId) : undefined;
  if (best) return { kind: "cover", cover: best };
  const latest = [...covers].reverse().find((cover) => cover.year !== null) ?? covers[covers.length - 1];
  if (latest) return { kind: "cover", cover: latest };
  return { kind: "initials", initials: initialsOf(name) };
}
