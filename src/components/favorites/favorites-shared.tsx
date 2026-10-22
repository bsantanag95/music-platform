import type { DiaryAudience, Favorite, FavoriteAudienceFacet, FavoriteCounts, SocialTargetType } from "@/lib/api/schemas";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";

// Orden fijo de tipos en el muro: artistas → álbumes → canciones. Coincide con
// el ORDER BY del servicio (`TYPE_RANK_EXPR`), así que la lista plana que llega
// ya viene en este orden y solo hay que partirla en secciones.
export const FAVORITE_TYPE_ORDER: SocialTargetType[] = ["artist", "release-group", "recording"];

export function favoriteTargetHref(favorite: Favorite): string {
  const { target } = favorite;
  if (favorite.targetType === "artist") return artistHref(target.title, target.id);
  if (favorite.targetType === "release-group") {
    return albumHref(target.artistName ?? null, target.title, target.id);
  }
  return songHref(target.artistName ?? null, target.title, target.id);
}

/** Enlace al artista acreditado de un álbum/canción favoritos; `null` si no se conoce. */
export function favoriteArtistHref(favorite: Favorite): string | null {
  return favorite.target.artistId
    ? artistHref(favorite.target.artistName ?? "", favorite.target.artistId)
    : null;
}

export function typeLabelKey(type: SocialTargetType): "typeArtist" | "typeAlbum" | "typeSong" {
  if (type === "artist") return "typeArtist";
  if (type === "release-group") return "typeAlbum";
  return "typeSong";
}

export function sectionTitleKey(
  type: SocialTargetType,
): "sectionArtists" | "sectionAlbums" | "sectionSongs" {
  if (type === "artist") return "sectionArtists";
  if (type === "release-group") return "sectionAlbums";
  return "sectionSongs";
}

export function countForType(
  counts: { artist: number; "release-group": number; recording: number },
  type: SocialTargetType,
): number {
  return counts[type];
}

export interface FavoriteGroup {
  type: SocialTargetType;
  favorites: Favorite[];
}

// Parte la lista plana (ya ordenada por rango de tipo) en secciones no vacías.
export function groupFavoritesByType(favorites: Favorite[]): FavoriteGroup[] {
  return FAVORITE_TYPE_ORDER.map((type) => ({
    type,
    favorites: favorites.filter((favorite) => favorite.targetType === type),
  })).filter((group) => group.favorites.length > 0);
}

export function formatFavoriteDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export interface FavoritePageFacets {
  counts: FavoriteCounts;
  audience: FavoriteAudienceFacet;
}

/**
 * Ajusta las facetas tras cambiar la audiencia de uno o varios favoritos (`next`) o quitarlos (`next = null`),
 * sin recargar la lista. La faceta de audiencia ignora el filtro de audiencia, así que siempre mueve la cantidad
 * de un cubo al otro; `counts` (por tipo) sí lo aplica, así que solo cambia si el favorito entra o sale del filtro
 * activo. Un favorito que ya tiene la audiencia nueva no cambia nada.
 */
export function adjustFavoriteFacets(
  facets: FavoritePageFacets,
  audienceFilter: DiaryAudience | "",
  changed: Favorite[],
  next: DiaryAudience | null,
): FavoritePageFacets {
  const audience = { ...facets.audience };
  const counts = { ...facets.counts };
  const inFilter = (value: DiaryAudience) => audienceFilter === "" || value === audienceFilter;
  for (const favorite of changed) {
    if (next !== null && favorite.audience === next) continue;
    audience[favorite.audience] = Math.max(0, audience[favorite.audience] - 1);
    if (next !== null) audience[next] += 1;
    const delta = (next !== null && inFilter(next) ? 1 : 0) - (inFilter(favorite.audience) ? 1 : 0);
    counts[favorite.targetType] = Math.max(0, counts[favorite.targetType] + delta);
  }
  return { counts, audience };
}
