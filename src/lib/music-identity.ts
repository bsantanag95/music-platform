// Identidad musical del perfil (spec profile-music-identity): "Me defino como",
// géneros, formatos de escucha y preguntas del perfil — todas listas CERRADAS,
// sin texto libre salvo la respuesta de una línea de cada pregunta. Módulo puro
// (sin base de datos ni `next/*`) para que lo importen el esquema Zod, el
// servicio y los editores cliente. Se guardan claves estables; los nombres viven
// en `messages/*/users.json`, así agregar un género es cambiar código, no una
// migración.

export const SELF_ROLES = ["listener", "collector", "musician", "dj", "critic", "radio-host"] as const;
export type SelfRole = (typeof SELF_ROLES)[number];

export const GENRES = [
  "rock",
  "punk",
  "post-punk",
  "indie",
  "shoegaze",
  "metal",
  "hip-hop",
  "electronic",
  "ambient",
  "jazz",
  "soul-funk",
  "folk",
  "blues",
  "classical",
  "pop",
  "latin",
  "reggae",
  "experimental",
  "country",
  "bossa-nova",
] as const;
export type Genre = (typeof GENRES)[number];

export const LISTENING_FORMATS = ["vinyl", "cd", "cassette", "streaming", "digital"] as const;
export type ListeningFormat = (typeof LISTENING_FORMATS)[number];

export const PROMPT_KEYS = [
  "first-record",
  "sunday-record",
  "defended-song",
  "guilty-pleasure",
  "first-concert",
  "desert-island-record",
  "sad-day-record",
  "road-trip-record",
] as const;
export type PromptKey = (typeof PROMPT_KEYS)[number];

/** Topes de cada campo; los `CHECK` de la migración 0040 reflejan los de las columnas. */
export const MUSIC_IDENTITY_LIMITS = {
  selfRoles: 3,
  genres: 5,
  listeningFormats: 5,
  prompts: 3,
  promptAnswer: 100,
} as const;

export interface ProfilePromptData {
  promptKey: PromptKey;
  answer: string;
  position: number;
}

export interface MusicIdentityData {
  selfRoles: SelfRole[];
  genres: Genre[];
  listeningFormats: ListeningFormat[];
  prompts: ProfilePromptData[];
}

export const EMPTY_MUSIC_IDENTITY: MusicIdentityData = {
  selfRoles: [],
  genres: [],
  listeningFormats: [],
  prompts: [],
};

/** ¿Hay algo que mostrar en la ficha de la Placa? */
export function hasMusicIdentity(identity: MusicIdentityData): boolean {
  return (
    identity.selfRoles.length > 0 ||
    identity.genres.length > 0 ||
    identity.listeningFormats.length > 0 ||
    identity.prompts.length > 0
  );
}

/** Una respuesta de pregunta es de UNA línea: sin saltos de línea. */
export function isSingleLine(value: string): boolean {
  return !/[\r\n]/.test(value);
}

// ---------------------------------------------------------------------------
// Zonas horarias (spec profile-identity, "Campos de identidad extendida"): un
// identificador IANA válido elegido de una lista, no texto libre.
// ---------------------------------------------------------------------------

// Respaldo mínimo por si el motor no expone `Intl.supportedValuesOf` (Node
// anteriores a 18). Cubre las zonas más comunes; el motor real las tiene todas.
const FALLBACK_TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Lima",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Santiago",
  "America/Sao_Paulo",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
];

function loadTimezones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  const names = typeof intl.supportedValuesOf === "function" ? intl.supportedValuesOf("timeZone") : FALLBACK_TIMEZONES;
  // `UTC` no figura en la lista del motor pero es una zona válida y común.
  return [...new Set([...names, "UTC"])].sort();
}

export const TIMEZONES: readonly string[] = loadTimezones();
const TIMEZONE_SET = new Set(TIMEZONES);

/** ¿Es un identificador de zona de la lista? Distingue mayúsculas: se guarda tal cual. */
export function isValidTimezone(value: string): boolean {
  return TIMEZONE_SET.has(value);
}

/**
 * Hora actual en una zona, como "14:32" en el idioma dado. `null` si la zona no
 * es válida. Se calcula al renderizar: es una pista de contexto, no un reloj.
 */
export function formatLocalTime(timezone: string, locale: string, now: Date = new Date()): string | null {
  if (!isValidTimezone(timezone)) return null;
  try {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: timezone }).format(now);
  } catch {
    return null;
  }
}
