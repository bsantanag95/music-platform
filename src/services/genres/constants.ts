// Umbrales y topes de la página de género (openspec: redesign-genre-page). Ajustables sin migración:
// son constantes de servicio. Los umbrales de elegibilidad se reutilizan de Explorar y del bloque de
// comunidad del álbum para que una misma regla no exista dos veces.

import { MIN_ALBUMS_FOR_SECTION, MIN_RATINGS_PER_ALBUM, RAIL_SIZE } from "@/services/discovery/constants";
import { COMMUNITY_MIN_COUNT } from "@/services/catalog/album-community-shared";

export { MIN_ALBUMS_FOR_SECTION, MIN_RATINGS_PER_ALBUM, COMMUNITY_MIN_COUNT };

/** Una lista cuenta como "del género" si tiene al menos tantos álbumes del subárbol. */
export const GENRE_LIST_MIN_ALBUMS = 3;

/** "Por década" y "década de auge" solo con álbumes en al menos tantas décadas. */
export const GENRE_DECADES_MIN = 2;

/** Tope de cada riel del Resumen (igual que los rieles de Explorar). */
export const GENRE_RAIL_SIZE = RAIL_SIZE;

/** Artistas en el Resumen. */
export const GENRE_OVERVIEW_ARTISTS = 8;

/** Listas en el carrusel del Resumen. */
export const GENRE_OVERVIEW_LISTS = 6;

/** Reseñas recientes en el Resumen. */
export const GENRE_REVIEWS_SIZE = 5;

/** Tamaño de página de las pestañas Álbumes, Artistas y Listas. */
export const GENRE_PAGE_SIZE = 24;

/** Subgéneros visibles antes del desplegable del árbol. */
export const GENRE_TREE_VISIBLE_CHILDREN = 12;

/** Vigencia del texto de Wikipedia: pasado este tiempo se vuelve a sincronizar. */
export const GENRE_ABOUT_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

/** Largo aproximado del primer párrafo de "Sobre el género". */
export const GENRE_ABOUT_EXCERPT_CHARS = 600;

/** Revalidación de los agregados públicos si hubiera que cachearlos (design D14). */
export const GENRE_AGGREGATES_REVALIDATE_SECONDS = 300;

// --- Descubrimiento de artistas (openspec: add-genre-artist-discovery) ---
// Se ajustan sin migración. El umbral de discografía corta NO se relaja para compensar la falta de
// datos: lo que falta (discografías sin explorar) se completa, no se reinterpreta.

/** Discografía corta: hasta tantos discos propios (estudio y single/EP como artista principal). */
export const DISCOVER_MAX_ALBUMS = 5;

/** Señal de comunidad del orden «descubrir»: media mínima de un álbum del género con valoraciones suficientes. */
export const DISCOVER_MIN_AVG = 3.5;

/** El riel «Para descubrir» se muestra solo con al menos tantos artistas elegibles. */
export const DISCOVER_MIN_ARTISTS = 4;

/** Artistas cuya discografía se completa en segundo plano por visita (acota la cola de MusicBrainz). */
export const GENRE_DISCOGRAPHY_PREFETCH = 3;
