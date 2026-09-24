// Fuente única de verdad para las vías de contacto y los perfiles sociales del
// sitio. TODAS las entradas de este archivo son MARCADORES DE POSICIÓN: ni la
// casilla de correo ni las cuentas sociales existen todavía. Cuando se creen,
// se actualiza acá — sin tocar el componente `Footer` ni los archivos de
// traducción.
//
// Regla del proyecto: el footer debe mostrar todas las vías de contacto y
// perfiles que el sitio tendrá, aunque de momento apunten a handles previstos y
// puedan dar 404. Ver `openspec/changes/add-site-footer/design.md` (decisión 8).

/** Casilla de rol prevista. TODO: reemplazar por la dirección real cuando exista. */
export const CONTACT_EMAIL = "hola@music-platform.app";

export interface SocialLink {
  /** Identificador estable, usado como key y para buscar su etiqueta en i18n (`footer.social.<id>`). */
  id: "x" | "instagram" | "mastodon" | "bluesky" | "discord" | "rss";
  /** URL prevista del perfil/canal. TODO: confirmar handles definitivos. */
  href: string;
}

/** Perfiles y canales del sitio, en orden de aparición. Todos placeholder. */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  // TODO: crear la cuenta y confirmar el handle.
  { id: "x", href: "https://x.com/musicplatform" },
  // TODO: crear la cuenta y confirmar el handle.
  { id: "instagram", href: "https://instagram.com/musicplatform" },
  // TODO: elegir instancia y crear la cuenta.
  { id: "mastodon", href: "https://mastodon.social/@musicplatform" },
  // TODO: crear la cuenta y confirmar el handle.
  { id: "bluesky", href: "https://bsky.app/profile/musicplatform.bsky.social" },
  // TODO: crear el servidor de comunidad y generar una invitación estable.
  { id: "discord", href: "https://discord.gg/musicplatform" },
  // TODO: exponer el feed real cuando exista la ruta.
  { id: "rss", href: "/feed.xml" },
] as const;

/**
 * Contacto público para pedir el retiro de una carátula (openspec:
 * mirror-cover-art). Se lee de `COVER_ART_TAKEDOWN_EMAIL`; junto con un storage
 * configurado habilita el espejo. Sin valor, el footer omite la frase de retiro
 * y la app resuelve carátulas por hotlink.
 */
export const COVER_TAKEDOWN_EMAIL: string | null =
  process.env.COVER_ART_TAKEDOWN_EMAIL?.trim() || null;

/** URLs oficiales de las fuentes de datos citadas en el bloque de atribución. */
export const DATA_SOURCE_URLS = {
  musicbrainz: "https://musicbrainz.org",
  coverArtArchive: "https://coverartarchive.org",
  metabrainz: "https://metabrainz.org",
} as const;
