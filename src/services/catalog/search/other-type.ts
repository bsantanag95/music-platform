import { searchAlbums } from "./albums";
import { searchSongs } from "./songs";
import type { AlbumSearchResult, SearchType, SongGroupResult } from "./types";

// «x» en otros tipos, para la columna lateral de /search (openspec: redesign-search-phase2, design D5): el mismo texto
// en otro tipo, **solo de la base propia** (`localOnly`), sin solicitudes a MusicBrainz. Artistas → álbumes, Álbumes →
// canciones, Canciones → álbumes; Usuarios no tiene panel.

export const OTHER_TYPE_LIMIT = 3;

export type OtherTypeMatches =
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
  try {
    if (other === "album") {
      const response = await searchAlbums(query, { localOnly: true });
      const rows = response.results.slice(0, OTHER_TYPE_LIMIT);
      return rows.length > 0 ? { type: "album", rows } : null;
    }
    const response = await searchSongs(query, { localOnly: true });
    const rows = response.results.slice(0, OTHER_TYPE_LIMIT);
    return rows.length > 0 ? { type: "song", rows } : null;
  } catch {
    return null;
  }
}
