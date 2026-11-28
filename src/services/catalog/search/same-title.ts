import { withoutLeadingArticle } from "./coverage";
import { tokenize } from "./normalize";

// Títulos repetidos en la búsqueda rápida (openspec: redesign-search-phase3, design D1 y D3). Cuando 24 discos se llaman
// «The Wall», lo que los distingue es el artista: la rejilla y las filas de canciones lo ponen como titular.

/** El título es la consulta, sin distinguir mayúsculas, acentos, puntuación ni un artículo inicial. */
export function sameTitleAsQuery(title: string, query: string): boolean {
  const queryTokens = withoutLeadingArticle(tokenize(query));
  const titleTokens = withoutLeadingArticle(tokenize(title));
  return queryTokens.length > 0 && queryTokens.length === titleTokens.length && queryTokens.every((t, i) => t === titleTokens[i]);
}

/** Mínimo de discos para que la rejilla compense frente a las filas. */
export const GRID_MIN_ALBUMS = 4;

/** Rejilla si hay al menos 4 discos y la mitad o más se llama como la consulta; si no, filas. */
export function albumView(query: string, others: readonly { title: string }[]): "grid" | "rows" {
  if (others.length < GRID_MIN_ALBUMS) return "rows";
  const same = others.filter((album) => sameTitleAsQuery(album.title, query)).length;
  return same * 2 >= others.length ? "grid" : "rows";
}
