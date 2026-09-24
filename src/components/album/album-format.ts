// Formato de datos de la página de álbum (openspec: redesign-album-page). Funciones puras:
// los componentes de servidor y de cliente las comparten y se testean sin render.

/** Duración en `m:ss`, o `h:mm:ss` desde una hora. */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  return `${minutes}:${ss}`;
}

export interface DurationSummary {
  trackCount: number;
  /** Suma de las duraciones conocidas, en segundos. */
  totalSeconds: number;
  /** Alguna pista no tiene duración: el total es un mínimo ("≥"), no exacto. */
  partial: boolean;
}

export function summarizeDurations(tracks: { durationSec: number | null }[]): DurationSummary {
  let totalSeconds = 0;
  let partial = false;
  for (const track of tracks) {
    if (track.durationSec === null) partial = true;
    else totalSeconds += track.durationSec;
  }
  return { trackCount: tracks.length, totalSeconds, partial };
}

/**
 * Fecha de lanzamiento con la precisión conocida: fecha completa cuando existe, si no el
 * año. `null` sin datos. Formatea en UTC para que "1973-03-24" no se corra un día.
 */
export function formatReleaseDate(
  date: string | null,
  year: number | null,
  locale: string,
): string | null {
  if (date) {
    return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(`${date}T00:00:00Z`),
    );
  }
  return year !== null ? String(year) : null;
}

/** Media de estrellas con un decimal en el formato del idioma ("4,6" / "4.6"). */
export function formatStars(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

const EXCERPT_LENGTH = 90;

/** Título de una reseña, o el inicio de su cuerpo cuando no tiene título (índice y modal). */
export function reviewHeadline(review: { title: string | null; body: string }): string {
  if (review.title) return review.title;
  const flat = review.body.replace(/\s+/g, " ").trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH).trimEnd()}…` : flat;
}
