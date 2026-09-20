import type { ProfileLinkKind } from "@/services/social/types";

// Reglas de los enlaces externos del perfil (spec profile-identity, "Enlaces de
// red social por nombre de usuario" y "Enlace con esquema implícito").
// TypeScript puro, sin `fetch` ni acceso a la base: lo consumen el esquema Zod
// del servidor, el editor del cliente y la vista del perfil, de modo que las
// reglas no puedan divergir. No comprueba que el usuario exista en el sitio,
// solo que el valor tenga la forma correcta para ese sitio.

export type HandleLinkKind = Exclude<ProfileLinkKind, "other">;
/** El enlace genérico ("Enlace"): cualquier dirección web, sin un sitio concreto. */
export type WebLinkKind = Extract<ProfileLinkKind, "other">;

export const WEB_LINK_KINDS: readonly WebLinkKind[] = ["other"];

export function isHandleLinkKind(kind: ProfileLinkKind): kind is HandleLinkKind {
  return kind !== "other";
}

/** Por qué se rechazó un valor; el editor lo traduce a un mensaje localizado. */
export type LinkErrorReason =
  | "empty"
  /** Es un enlace de otro sitio (o una dirección de otro sitio escrita como usuario). */
  | "wrong_site"
  /** Es un enlace del sitio, pero sin usuario (la portada, una publicación…). */
  | "missing_handle"
  /** El usuario no cumple las reglas de longitud o caracteres del sitio. */
  | "invalid_handle"
  /** YouTube: el enlace es de un formato sin `@handle` (`/channel/…`, `/c/…`). */
  | "youtube_format"
  /** Enlace: no es una URL con un dominio válido. */
  | "invalid_url"
  /** Esquema distinto de http/https (`javascript:`, `mailto:`, `ftp:`…). */
  | "unsafe_scheme";

export type LinkNormalization =
  | { ok: true; url: string; handle: string | null }
  | { ok: false; reason: LinkErrorReason };

const fail = (reason: LinkErrorReason): LinkNormalization => ({ ok: false, reason });

interface HandleSite {
  /** Hosts propios del sitio (ya sin `www.`/`m.`/`mobile.`). */
  hosts: readonly string[];
  /** Alternativa a `hosts` cuando el usuario vive en el host (Bandcamp). */
  matchesHost?: (host: string) => boolean;
  /** Reglas del usuario, sin el `@`. */
  handle: RegExp;
  /** `true` → el usuario se muestra como `@usuario`. */
  at: boolean;
  lowercase?: boolean;
  /** Usuario a partir de un enlace del sitio; `null` = el enlace no trae usuario. */
  fromUrl(host: string, segments: string[]): string | "youtube_format" | null;
  build(handle: string): string;
}

const LOCALE = /^[a-z]{2}(?:-[a-z]{2})?$/i;

/** Primer segmento de la ruta que no sea una página reservada del sitio. */
function firstSegment(segments: string[], reserved: ReadonlySet<string>): string | null {
  const first = segments[0];
  if (!first || reserved.has(first.toLowerCase())) return null;
  return first.replace(/^@/, "");
}

/** `/user/{u}`, con un prefijo de idioma opcional (`/es/user/{u}`, `/intl-es/user/{u}`). */
function userSegment(segments: string[], localePrefix: RegExp): string | null {
  const rest = segments.length > 0 && localePrefix.test(segments[0]!) ? segments.slice(1) : segments;
  return rest[0]?.toLowerCase() === "user" && rest[1] ? rest[1] : null;
}

const INSTAGRAM_RESERVED = new Set([
  "p", "reel", "reels", "explore", "accounts", "stories", "tv", "direct", "about", "legal", "developer", "web",
]);
const X_RESERVED = new Set([
  "home", "i", "intent", "share", "search", "explore", "settings", "hashtag", "compose",
  "notifications", "messages", "login", "signup", "tos", "privacy",
]);
const SOUNDCLOUD_RESERVED = new Set([
  "discover", "search", "stream", "you", "upload", "pages", "charts", "popular", "terms-of-use", "tags", "mobile",
]);
const YOUTUBE_OTHER_FORMATS = new Set(["channel", "c", "user"]);
const BANDCAMP_RESERVED = new Set(["www", "daily", "bandcamp"]);

const SITES: Record<HandleLinkKind, HandleSite> = {
  instagram: {
    hosts: ["instagram.com", "instagr.am"],
    handle: /^[A-Za-z0-9._]{1,30}$/,
    at: true,
    fromUrl: (_host, segments) => firstSegment(segments, INSTAGRAM_RESERVED),
    build: (handle) => `https://www.instagram.com/${handle}`,
  },
  x: {
    hosts: ["x.com", "twitter.com"],
    handle: /^[A-Za-z0-9_]{1,15}$/,
    at: true,
    fromUrl: (_host, segments) => firstSegment(segments, X_RESERVED),
    build: (handle) => `https://x.com/${handle}`,
  },
  tiktok: {
    hosts: ["tiktok.com"],
    handle: /^[A-Za-z0-9._]{2,24}$/,
    at: true,
    fromUrl: (_host, segments) => (segments[0]?.startsWith("@") ? segments[0].slice(1) : null),
    build: (handle) => `https://www.tiktok.com/@${handle}`,
  },
  youtube: {
    hosts: ["youtube.com"],
    handle: /^[A-Za-z0-9._-]{3,30}$/,
    at: true,
    fromUrl: (_host, segments) => {
      const first = segments[0];
      if (!first) return null;
      if (first.startsWith("@")) return first.slice(1);
      return YOUTUBE_OTHER_FORMATS.has(first.toLowerCase()) ? "youtube_format" : null;
    },
    build: (handle) => `https://www.youtube.com/@${handle}`,
  },
  soundcloud: {
    hosts: ["soundcloud.com"],
    handle: /^[A-Za-z0-9_-]{3,25}$/,
    at: false,
    fromUrl: (_host, segments) => firstSegment(segments, SOUNDCLOUD_RESERVED),
    build: (handle) => `https://soundcloud.com/${handle}`,
  },
  bandcamp: {
    hosts: [],
    matchesHost: (host) => host.endsWith(".bandcamp.com") || host === "bandcamp.com",
    handle: /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i,
    at: false,
    lowercase: true,
    fromUrl: (host) => {
      const sub = host.endsWith(".bandcamp.com") ? host.slice(0, -".bandcamp.com".length) : "";
      return sub && !sub.includes(".") && !BANDCAMP_RESERVED.has(sub) ? sub : null;
    },
    build: (handle) => `https://${handle}.bandcamp.com`,
  },
  lastfm: {
    hosts: ["last.fm"],
    handle: /^[A-Za-z][A-Za-z0-9_-]{1,14}$/,
    at: false,
    fromUrl: (_host, segments) => userSegment(segments, LOCALE),
    build: (handle) => `https://www.last.fm/user/${handle}`,
  },
  discogs: {
    hosts: ["discogs.com"],
    handle: /^[A-Za-z0-9._-]{1,50}$/,
    at: false,
    fromUrl: (_host, segments) => userSegment(segments, LOCALE),
    build: (handle) => `https://www.discogs.com/user/${handle}`,
  },
  spotify: {
    hosts: ["open.spotify.com", "spotify.com"],
    handle: /^[A-Za-z0-9._-]{1,50}$/,
    at: false,
    fromUrl: (_host, segments) => userSegment(segments, /^intl-[a-z]{2}(?:-[a-z]{2})?$/i),
    build: (handle) => `https://open.spotify.com/user/${handle}`,
  },
};

const HOST_PREFIX = /^(?:www|m|mobile)\./;

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(HOST_PREFIX, "");
}

function siteMatchesHost(site: HandleSite, host: string): boolean {
  const normalized = normalizeHost(host);
  return site.matchesHost ? site.matchesHost(normalized) : site.hosts.includes(normalized);
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

// Una dirección de un sitio conocido escrita donde iba el usuario ("facebook.com").
// Solo TLD genéricos: un usuario como "ana.es" o "ana.perez" sigue siendo válido.
const LOOKS_LIKE_DOMAIN = /^[^\s@/]+\.(?:com|net|org|fm|io|tv|app)$/i;

const EXPLICIT_SCHEME = /^([a-z][a-z0-9+.-]*):\/\//i;

function fromUrlValue(kind: HandleLinkKind, site: HandleSite, value: string): LinkNormalization {
  const scheme = EXPLICIT_SCHEME.exec(value)?.[1];
  if (scheme && !/^https?$/i.test(scheme)) return fail("unsafe_scheme");

  let url: URL;
  try {
    url = new URL(scheme ? value : `https://${value}`);
  } catch {
    return fail("invalid_url");
  }

  const host = normalizeHost(url.hostname);
  if (!siteMatchesHost(site, host)) return fail("wrong_site");

  const segments = url.pathname.split("/").filter(Boolean).map(safeDecode);
  const extracted = site.fromUrl(host, segments);
  if (extracted === "youtube_format") return fail("youtube_format");
  if (extracted === null || extracted === "") return fail("missing_handle");

  return finishHandle(kind, site, extracted);
}

function finishHandle(kind: HandleLinkKind, site: HandleSite, raw: string): LinkNormalization {
  const handle = site.lowercase ? raw.toLowerCase() : raw;
  if (!site.handle.test(handle)) return fail("invalid_handle");
  return { ok: true, url: SITES[kind].build(handle), handle };
}

function looksLikeUrl(site: HandleSite, value: string): boolean {
  if (/^https?:\/\//i.test(value) || value.includes("/") || EXPLICIT_SCHEME.test(value)) return true;
  const first = value.split(/[?#]/)[0]!.toLowerCase();
  return siteMatchesHost(site, first);
}

function normalizeHandleInput(kind: HandleLinkKind, raw: string): LinkNormalization {
  const site = SITES[kind];
  const value = raw.trim();
  if (value.length === 0) return fail("empty");
  if (/\s/.test(value)) return fail("invalid_handle");

  if (looksLikeUrl(site, value)) return fromUrlValue(kind, site, value);
  if (LOOKS_LIKE_DOMAIN.test(value)) return fail("wrong_site");
  return finishHandle(kind, site, value.replace(/^@/, ""));
}

// Al menos dos etiquetas; cada una empieza y termina en letra o número (el punto
// y guion sueltos no forman un dominio) y la última tiene ≥2 caracteres.
const HOST_LABEL = "[a-z0-9](?:[a-z0-9-]*[a-z0-9])?";
const VALID_HOSTNAME = new RegExp(`^(?:${HOST_LABEL}\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])$`, "i");

/**
 * Enlace: acepta el valor sin esquema (antepone `https://`), respeta
 * un `http://` explícito y rechaza esquemas no web, valores sin dominio y valores
 * con espacios. No altera el resto del texto (no añade `/` final).
 */
export function normalizeWebUrl(raw: string): LinkNormalization {
  const value = raw.trim();
  if (value.length === 0) return fail("empty");
  if (/\s/.test(value)) return fail("invalid_url");

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1];
  const isWebScheme = scheme !== undefined && /^https?$/i.test(scheme);
  // `localhost:3000` o `ejemplo.com:8080` parecen un esquema pero son host:puerto.
  const looksLikeHostPort = /^[^:/?#]+:\d+(?:[/?#]|$)/.test(value);
  if (scheme !== undefined && !isWebScheme && !looksLikeHostPort) return fail("unsafe_scheme");

  const candidate = /^https?:\/\//i.test(value)
    ? value
    : value.startsWith("//")
      ? `https:${value}`
      : `https://${value}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return fail("invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return fail("unsafe_scheme");
  if (url.username !== "" || url.password !== "") return fail("invalid_url");
  if (!VALID_HOSTNAME.test(url.hostname)) return fail("invalid_url");

  return { ok: true, url: candidate, handle: null };
}

/**
 * Valida y normaliza lo que la persona escribió para un enlace de `kind`.
 * Devuelve la URL canónica que se guarda y, para los tipos por usuario, el
 * usuario extraído.
 */
export function normalizeLinkInput(kind: ProfileLinkKind, raw: string): LinkNormalization {
  return isHandleLinkKind(kind) ? normalizeHandleInput(kind, raw) : normalizeWebUrl(raw);
}

export interface StoredLinkInfo {
  /** El enlace guardado coincide con su tipo (siempre `true` para sitio web/enlace válidos). */
  consistent: boolean;
  /** Usuario (tipos por usuario coherentes), sin `@`. */
  handle: string | null;
  /** Texto de detalle para el nombre accesible: `@ana`, `ana` o el dominio. */
  detail: string | null;
}

/**
 * Interpreta un enlace ya guardado. Un enlace de un tipo por usuario que no
 * coincide con su sitio (p. ej. un Instagram que apunta a la portada) devuelve
 * `consistent: false`: se conserva y se muestra con un ícono genérico, y se
 * valida cuando la persona lo edita (spec, "Enlaces guardados que no coinciden
 * con su tipo").
 */
export function describeStoredLink(kind: ProfileLinkKind, url: string): StoredLinkInfo {
  if (isHandleLinkKind(kind)) {
    const parsed = normalizeHandleInput(kind, url);
    if (!parsed.ok || parsed.handle === null) return { consistent: false, handle: null, detail: hostOf(url) };
    return { consistent: true, handle: parsed.handle, detail: `${SITES[kind].at ? "@" : ""}${parsed.handle}` };
  }
  return { consistent: true, handle: null, detail: hostOf(url) };
}

/** El usuario que hay que mostrar en el campo del editor para un enlace guardado. */
export function editableValue(kind: ProfileLinkKind, url: string): string {
  if (!isHandleLinkKind(kind)) return url;
  const info = describeStoredLink(kind, url);
  return info.consistent && info.handle !== null ? info.handle : url;
}

/** Dominio sin `www.`, para mostrar; `null` si la URL no se puede interpretar. */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

/** La URL sin esquema ni `www.`, para la vista previa del editor (`instagram.com/ana`). */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(?:www\.)?/i, "");
}
