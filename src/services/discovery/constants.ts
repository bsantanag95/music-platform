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

/** Tamaño de página de los listados filtrados por década, familia o género. */
export const FILTERED_PAGE_SIZE = 24;

/** Categorías de release-group que cuentan como "novedad". */
export const NEW_RELEASE_CATEGORIES = ["studio", "single_ep"] as const;

/**
 * Ventana del riel "Novedades" de `/explore`: solo cuenta lo lanzado en los últimos N días (hasta
 * hoy, inclusive). Ajustable sin migración; si el riel queda oculto a menudo, subirla (p. ej. 180).
 */
export const NEW_RELEASE_WINDOW_DAYS = 90;

/**
 * Ventana del riel y del listado de "Próximos lanzamientos" de `/explore`: desde mañana hasta hoy +
 * N días. Más amplia que la de Inicio (60–90) porque Explorar es la vista completa, no el resumen.
 */
export const UPCOMING_WINDOW_DAYS = 180;

/**
 * Cuenta curadora: sus listas públicas de álbumes son el contenido editorial
 * de `/explore`. Sin `password_hash` — no puede iniciar sesión. La siembra
 * `scripts/seed-discovery.ts` la crea; el frontend arma con este `username`
 * el enlace al detalle de sus listas.
 */
export const CURATOR_USERNAME = "exploracion";
export const CURATOR_DISPLAY_NAME = "Exploración";

/**
 * Colecciones generadas (openspec: automate-explore-collections, ADR 0033): una plantilla se
 * regenera cuando su última corrida exitosa tiene más de estos días. Constante de servicio.
 */
export const COLLECTION_REFRESH_DAYS = 7;

/** Una corrida `running` más vieja que esto se da por muerta (proceso cortado). */
export const COLLECTION_RUNNING_STALE_MS = 15 * 60 * 1000;

/** Máximo de tarjetas del riel "Colecciones destacadas" de `/explore`. */
export const FEATURED_RAIL_LIMIT = 6;

/** Ítems por colección generada. */
export const COLLECTION_SIZE = 12;
