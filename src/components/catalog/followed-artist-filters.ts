// Órdenes de "Artistas que sigo". Módulo sin "use client" para que lo importen la página (validación de `?sort=`) y
// los componentes de cliente (refine-artists-page-phase1, D4).
export type FollowedArtistSort = "recent" | "alpha";

export const FOLLOWED_ARTIST_SORTS: readonly FollowedArtistSort[] = ["recent", "alpha"];
