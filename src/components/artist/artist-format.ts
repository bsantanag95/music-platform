// Formato de los datos de la página de artista (openspec: redesign-artist-page). Funciones
// puras, sin estado, compartidas entre componentes de servidor y cliente.

/** Año de una fecha parcial ('YYYY', 'YYYY-MM' o 'YYYY-MM-DD'). */
export function yearOf(value: string | null): string | null {
  return value && /^\d{4}/.test(value) ? value.slice(0, 4) : null;
}

/**
 * Fecha parcial con su precisión: solo año, mes y año, o fecha completa. Nunca inventa el
 * mes ni el día que MusicBrainz no informa.
 */
export function formatPartialDate(value: string | null, locale: string): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year) return null;
  if (!month) return String(year);
  // Mediodía UTC: evita que el huso horario corra la fecha un día.
  const date = new Date(Date.UTC(year, month - 1, day || 1, 12));
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    ...(day ? { day: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}

/** Nombre del país por su código ISO, en el idioma de la interfaz. */
export function countryName(code: string | null, locale: string): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? null;
  } catch {
    return null;
  }
}

/** Clave de mensaje de un tipo de MusicBrainz ("DJ-mix" → "dj_mix", "Audio drama" → "audio_drama"). */
export function kindKey(kind: string): string {
  return kind.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/** Nombre de la plataforma de un enlace de streaming. */
export function streamingName(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "open.spotify.com") return "Spotify";
    if (host === "music.apple.com") return "Apple Music";
    if (host === "deezer.com") return "Deezer";
    if (host === "music.youtube.com") return "YouTube Music";
  } catch {
    // URL inválida: se muestra el rótulo genérico.
  }
  return null;
}
