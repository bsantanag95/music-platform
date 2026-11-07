// Listas cerradas de Compartir (openspec: add-share-foundation). Las mismas listas validan el endpoint de
// eventos, la ruta de imágenes y los `CHECK` de `share_event` (drizzle/0079_share_event.sql): si se
// agrega un valor acá, va también en una migración nueva.

/**
 * Tipos de objeto que se pueden compartir. `awards`, `halls` y `collections` son los índices; `collection` es una
 * colección de Explorar y `user_collection`, la colección física de un perfil.
 */
export const SHARE_TARGET_KINDS = [
  "album",
  "song",
  "artist",
  "genre",
  "awards",
  "award",
  "ceremony",
  "halls",
  "hall",
  "hall_class",
  "collections",
  "collection",
  "profile",
  "review",
  "comment",
  "list",
  "camino",
  "user_collection",
  "fingerprint",
  "rating",
  "listen",
  "top",
] as const;
export type ShareTargetKind = (typeof SHARE_TARGET_KINDS)[number];

/** Canales de la hoja de compartir; `native` es el menú del sistema y `download` la descarga de la imagen. */
export const SHARE_CHANNELS = [
  "native",
  "copy",
  "x",
  "whatsapp",
  "threads",
  "bluesky",
  "facebook",
  "telegram",
  "reddit",
  "download",
] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

/** Formatos de imagen: Enlace (1200×630), Historia (1080×1920), Publicación (1080×1350) y Cuadrado (1080×1080). */
export const SHARE_FORMATS = ["link", "story", "post", "square"] as const;
export type ShareFormat = (typeof SHARE_FORMATS)[number];

export const SHARE_LOCALES = ["es", "en"] as const;
export type ShareLocale = (typeof SHARE_LOCALES)[number];

export function isShareTargetKind(value: string): value is ShareTargetKind {
  return (SHARE_TARGET_KINDS as readonly string[]).includes(value);
}

export function isShareFormat(value: string): value is ShareFormat {
  return (SHARE_FORMATS as readonly string[]).includes(value);
}

export function isShareLocale(value: string): value is ShareLocale {
  return (SHARE_LOCALES as readonly string[]).includes(value);
}
