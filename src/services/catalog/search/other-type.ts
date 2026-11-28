import { searchAlbums } from "./albums";
import { searchArtists } from "./artists";
import { searchSongs } from "./songs";
import type { AlbumSearchResult, ArtistSearchResult, CatalogSearchType, SearchType, SongGroupResult } from "./types";

// «x» en otros tipos, para la columna lateral de /search (openspec: redesign-search-phase2, design D5): el mismo texto
// en otro tipo, **solo de la base propia** (`localOnly`), sin solicitudes a MusicBrainz. Artistas → álbumes, Álbumes →
// canciones, Canciones → álbumes; Usuarios no tiene panel.

export const OTHER_TYPE_LIMIT = 3;

export type OtherTypeMatches =
  | { type: "artist"; rows: ArtistSearchResult[] }
  | { type: "album"; rows: AlbumSearchResult[] }
  | { type: "song"; rows: SongGroupResult[] };

/** A qué tipo se asoma cada tipo; `null` sin panel. */
export function otherTypeOf(type: SearchType): "album" | "song" | null {
  if (type === "artist" || type === "song") return "album";
  if (type === "album") return "song";
  return null;
}

/** Hasta 3 coincidencias locales en el otro tipo; `null` si no hay panel o no hay ninguna (o falla: es un extra). */
export async function findInOtherType(type: SearchType, query: string): Promise<OtherTypeMatches | null> {
  const other = otherTypeOf(type);
  if (!other || !query.trim()) return null;
  return localMatches(other, query);
}

/** Coincidencias locales de un tipo de catálogo (hasta 3); `null` sin ninguna o si falla. */
async function localMatches(type: CatalogSearchType, query: string): Promise<OtherTypeMatches | null> {
  try {
    if (type === "artist") {
      const rows = (await searchArtists(query, { localOnly: true })).results.slice(0, OTHER_TYPE_LIMIT);
      return rows.length > 0 ? { type, rows } : null;
    }
    if (type === "album") {
      const rows = (await searchAlbums(query, { localOnly: true })).results.slice(0, OTHER_TYPE_LIMIT);
      return rows.length > 0 ? { type, rows } : null;
    }
    const rows = (await searchSongs(query, { localOnly: true })).results.slice(0, OTHER_TYPE_LIMIT);
    return rows.length > 0 ? { type, rows } : null;
  } catch {
    return null;
  }
}

const CATALOG_TYPES: CatalogSearchType[] = ["artist", "album", "song"];

/**
 * Para el estado sin resultados (openspec: redesign-search-phase3, design D4): coincidencias locales en cada otro tipo de
 * catálogo, en paralelo y sin MusicBrainz. Devuelve solo los tipos con alguna, en el orden Artistas, Álbumes, Canciones.
 */
export async function findInAllOtherTypes(type: SearchType, query: string): Promise<OtherTypeMatches[]> {
  if (!query.trim()) return [];
  const found = await Promise.all(CATALOG_TYPES.filter((other) => other !== type).map((other) => localMatches(other, query)));
  return found.filter((matches): matches is OtherTypeMatches => matches !== null);
}
