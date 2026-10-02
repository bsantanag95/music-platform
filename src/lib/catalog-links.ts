import { buildSegment, slugify, truncateSlug } from "./slug";

// Constructores únicos de las direcciones públicas del catálogo (openspec:
// add-catalog-slugs, design D6). Devuelven rutas sin locale para el `Link` de
// `@/i18n/navigation`; `localeHref` antepone el locale para los `redirect` de
// servidor y los `<a>` que no pasan por next-intl. El artista principal es un
// argumento obligatorio (`string | null`, sin valor por defecto) para que el
// compilador obligue a decidir en cada sitio si se conoce.

/** Tope de puntos de código del slug de un artista. */
export const ARTIST_SLUG_MAX = 30;
/** Tope de puntos de código del slug del título de un álbum o canción. */
export const TITLE_SLUG_MAX = 60;
/** Tope de puntos de código del slug del nombre de una lista. */
export const LIST_SLUG_MAX = 60;

function joinParts(...parts: string[]): string {
  return parts.filter((part) => part.length > 0).join("-");
}

/** Segmento canónico de un artista: `slug-<id>`. */
export function artistSegment(artistName: string, artistId: string): string {
  return buildSegment(truncateSlug(slugify(artistName), ARTIST_SLUG_MAX), artistId);
}

/** Segmento canónico de un álbum o canción: `<artista>-<título>-<id>`, o solo título. */
export function titledSegment(artistName: string | null, title: string, id: string): string {
  const titlePart = truncateSlug(slugify(title), TITLE_SLUG_MAX);
  const artistPart = artistName ? truncateSlug(slugify(artistName), ARTIST_SLUG_MAX) : "";
  return buildSegment(joinParts(artistPart, titlePart), id);
}

/** Segmento canónico de un álbum. */
export function albumSegment(artistName: string | null, title: string, albumId: string): string {
  return titledSegment(artistName, title, albumId);
}

/** Segmento canónico de una canción. */
export function songSegment(artistName: string | null, title: string, recordingId: string): string {
  return titledSegment(artistName, title, recordingId);
}

/** Segmento canónico de una lista pública: `<nombre>-<id>`. */
export function listSegment(listName: string, listId: string): string {
  return buildSegment(truncateSlug(slugify(listName), LIST_SLUG_MAX), listId);
}

/** Segmento canónico de una reseña: `<usuario>-<álbum>-<id>`. */
export function reviewSegment(username: string, albumTitle: string, reviewId: string): string {
  return buildSegment(joinParts(slugify(username), slugify(albumTitle)), reviewId);
}

export function artistHref(artistName: string, artistId: string): string {
  return `/artist/${artistSegment(artistName, artistId)}`;
}

export function albumHref(artistName: string | null, title: string, albumId: string): string {
  return `/album/${titledSegment(artistName, title, albumId)}`;
}

export function songHref(artistName: string | null, title: string, recordingId: string): string {
  return `/song/${titledSegment(artistName, title, recordingId)}`;
}

export function listHref(username: string, listName: string, listId: string): string {
  return `/users/${encodeURIComponent(username)}/lists/${listSegment(listName, listId)}`;
}

export function reviewHref(username: string, albumTitle: string, reviewId: string): string {
  return `/review/${reviewSegment(username, albumTitle, reviewId)}`;
}

/** Página de un género de la taxonomía: usa su slug guardado, sin id (ADR 0023). */
export function genreHref(slug: string): string {
  return `/genre/${slug}`;
}

/** Antepone el locale a una ruta sin locale (redirect de servidor, `<a>` duro). */
export function localeHref(locale: string, href: string): string {
  return `/${locale}${href}`;
}
