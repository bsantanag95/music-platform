// Umbrales del descubrimiento de álbumes (openspec: add-album-discovery).
// Ajustables sin migración: son constantes de servicio, no columnas.

/**
 * Elegibilidad del álbum en el riel "Mejor valorados": un álbum solo entra
 * si tiene al menos esta cantidad de valoraciones. Evita que un promedio alto
 * con muy pocas señales quede por encima de uno respaldado por muchas.
 */
export const MIN_RATINGS_PER_ALBUM = 3;

/** Elegibilidad del álbum en el riel "Más reseñados". */
export const MIN_REVIEWS_PER_ALBUM = 1;

/**
 * Visibilidad del riel: una sección por reglas se muestra solo si hay al
 * menos esta cantidad de álbumes elegibles. Debajo de eso el riel se omite
 * por completo (no se muestra vacío).
 */
export const MIN_ALBUMS_FOR_SECTION = 6;

/** Cuántos ítems muestra cada riel de la portada de /explore (sin paginar). */
export const RAIL_SIZE = 12;

/** Cuántos géneros ofrece el riel "Explorar por género". */
export const GENRE_TOP_N = 12;

/** Tamaño de página de los listados filtrados por década o género. */
export const FILTERED_PAGE_SIZE = 24;

/** Categorías de release-group que cuentan como "novedad". */
export const NEW_RELEASE_CATEGORIES = ["studio", "single_ep"] as const;

/**
 * Cuenta curadora: sus listas públicas de álbumes son el contenido editorial
 * de `/explore`. Sin `password_hash` — no puede iniciar sesión. La siembra
 * `scripts/seed-discovery.ts` la crea; el frontend arma con este `username`
 * el enlace al detalle de sus listas.
 */
export const CURATOR_USERNAME = "exploracion";
export const CURATOR_DISPLAY_NAME = "Exploración";
