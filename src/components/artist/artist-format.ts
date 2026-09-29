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

/** Período de la alineación (openspec: add-artist-members-tab): fechas con su precisión y si terminó. */
export interface LineupSpanLike {
  beginDate: string | null;
  endDate: string | null;
  ended: boolean;
}

export interface LineupPeriodLabels {
  /** Fin de un período abierto: "presente". */
  present: string;
  /** Período sin fechas: "período desconocido". */
  unknown: string;
}

/**
 * Años de un período de la alineación: `1981–1992`; abierto `2018–presente`; mismo año `2005`;
 * sin inicio `?–1992`; terminado sin fin `1992–?`; sin fechas, "período desconocido".
 */
export function formatLineupPeriod(span: LineupSpanLike, labels: LineupPeriodLabels): string {
  const begin = yearOf(span.beginDate);
  const end = yearOf(span.endDate);
  if (!begin && !end) return labels.unknown;
  if (begin && end) return begin === end ? begin : `${begin}–${end}`;
  if (begin) return `${begin}–${span.ended ? "?" : labels.present}`;
  return `?–${end}`;
}

/** Varios períodos separados por coma: `1981–1992, 1997–2015, 2018–presente`. */
export function formatLineupPeriods(spans: LineupSpanLike[], labels: LineupPeriodLabels): string {
  return spans.map((span) => formatLineupPeriod(span, labels)).join(", ");
}

/**
 * Una línea del rol de un integrante: instrumentos traducidos con mayúscula inicial, la marca de
 * adicional y sus períodos entre paréntesis ("Batería (1981–1999, 2004–presente)",
 * "Tornamesa · adicional (período desconocido)"). Sin instrumentos, solo los años.
 */
export function formatInstrumentLine(
  line: { instruments: string[]; periods: LineupSpanLike[] },
  { label, additional, ...labels }: LineupPeriodLabels & { label: (raw: string) => string; additional?: string },
): string {
  const periods = formatLineupPeriods(line.periods, labels);
  const instruments = line.instruments.map(label).join(", ");
  const head = [instruments ? instruments.charAt(0).toLocaleUpperCase() + instruments.slice(1) : "", additional ?? ""]
    .filter(Boolean)
    .join(" · ");
  return head ? `${head} (${periods})` : periods;
}

/**
 * Restituye el espacio entre oraciones que el extracto de Wikipedia pierde al quitar las
 * referencias ("estadounidense.Obtuvo" → "estadounidense. Obtuvo"). Solo actúa entre una
 * minúscula y una mayúscula, así que no toca siglas ("U.S.A.") ni decimales.
 */
export function repairSentenceSpacing(text: string): string {
  return text.replace(/(\p{Ll})([.!?])(\p{Lu})/gu, "$1$2 $3");
}
