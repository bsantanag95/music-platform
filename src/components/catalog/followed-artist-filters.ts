import type { FollowedArtistDto, FollowedArtistRelease } from "@/lib/api/schemas";

// Órdenes y segmentos de "Artistas que sigo". Módulo sin "use client" para que lo importen la página (validación de
// `?sort=` y `?segment=`) y los componentes de cliente (refine-artists-page-phase1, D4; redesign-artists-toolbar).
export type FollowedArtistSort = "recent" | "alpha" | "release";

export const FOLLOWED_ARTIST_SORTS: readonly FollowedArtistSort[] = ["recent", "alpha", "release"];

export type FollowedArtistSegment = "all" | "news" | "groups" | "solo";

export const FOLLOWED_ARTIST_SEGMENTS: readonly FollowedArtistSegment[] = ["all", "news", "groups", "solo"];

// Grupos: grupo, orquesta o coro; solistas: persona. El resto de los tipos solo cuenta en "Todos" (D4).
const GROUP_TYPES = new Set(["group", "orchestra", "choir"]);

export function inSegment(artist: FollowedArtistDto, segment: FollowedArtistSegment): boolean {
  switch (segment) {
    case "all":
      return true;
    case "news":
      return Boolean(artist.news);
    case "groups":
      return GROUP_TYPES.has(artist.type);
    case "solo":
      return artist.type === "person";
  }
}

export function countBySegment(artists: FollowedArtistDto[]): Record<FollowedArtistSegment, number> {
  const counts = { all: 0, news: 0, groups: 0, solo: 0 };
  for (const artist of artists) {
    for (const segment of FOLLOWED_ARTIST_SEGMENTS) if (inSegment(artist, segment)) counts[segment]++;
  }
  return counts;
}

// Clave del orden "Último lanzamiento" (D5): la fecha de la novedad o, si no hay, la del último disco (solo el año →
// 1 de enero). Sin dato, `null`.
function releaseKey(artist: FollowedArtistDto): string | null {
  const release: FollowedArtistRelease | null | undefined = artist.news ?? artist.latestRelease;
  if (!release) return null;
  if (release.date) return release.date;
  return release.year != null ? `${String(release.year).padStart(4, "0")}-01-01` : null;
}

/** Más reciente primero; sin dato al final, en el orden que traían (Recientes). Estable. */
export function sortByLatestRelease(artists: FollowedArtistDto[]): FollowedArtistDto[] {
  return artists
    .map((artist, index) => ({ artist, index, key: releaseKey(artist) }))
    .sort((a, b) => {
      if (a.key === b.key) return a.index - b.index;
      if (a.key === null) return 1;
      if (b.key === null) return -1;
      return a.key < b.key ? 1 : -1;
    })
    .map((item) => item.artist);
}
