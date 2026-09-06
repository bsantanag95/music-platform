import type { Favorite, SocialTargetType } from "@/lib/api/schemas";

// Orden fijo de tipos en el muro: artistas → álbumes → canciones. Coincide con
// el ORDER BY del servicio (`TYPE_RANK_EXPR`), así que la lista plana que llega
// ya viene en este orden y solo hay que partirla en secciones.
export const FAVORITE_TYPE_ORDER: SocialTargetType[] = ["artist", "release-group", "recording"];

export function favoriteTargetHref(favorite: Favorite): string {
  if (favorite.targetType === "artist") return `/artist/${favorite.target.id}`;
  if (favorite.targetType === "release-group") return `/album/${favorite.target.id}`;
  return `/song/${favorite.target.id}`;
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
