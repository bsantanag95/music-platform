import { countryName } from "@/lib/personal-info";
import type { ConcertEntryDto } from "@/lib/api/schemas";

// Formato de un concierto para mostrarlo (openspec: add-my-concerts). Funciones puras: las usan la página propia, la
// ajena, el riel del perfil y el formulario.

/** Partes de una fecha parcial (`YYYY`, `YYYY-MM` o `YYYY-MM-DD`). */
export function concertDateParts(value: string): { year: number; month: number | null; day: number | null } {
  const [year, month, day] = value.split("-").map(Number);
  return { year: year ?? 0, month: month ?? null, day: day ?? null };
}

/** Fecha con su precisión, en el idioma: "2019", "noviembre de 2019", "2 de noviembre de 2019". */
export function formatConcertDate(value: string, locale: string): string {
  const { year, month, day } = concertDateParts(value);
  if (month === null) return String(year);
  const date = new Date(Date.UTC(year, month - 1, day ?? 1));
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    ...(day !== null ? { day: "numeric" } : {}),
  }).format(date);
}

/**
 * Fecha corta para la columna de fecha de una lista: "2 nov" bajo el encabezado de su año, "2 nov 2027" si el año no
 * está a la vista (`withYear`). Con menos precisión: "noviembre" o, si solo hay año, el año.
 */
export function formatConcertShortDate(value: string, locale: string, withYear = false): string {
  const { year, month, day } = concertDateParts(value);
  if (month === null) return String(year);
  const date = new Date(Date.UTC(year, month - 1, day ?? 1));
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: day !== null || withYear ? "short" : "long",
    ...(day !== null ? { day: "numeric" } : {}),
    ...(withYear ? { year: "numeric" } : {}),
  })
    .format(date)
    .replace(/\./g, "");
}

/** Lugar: "Autódromo de Interlagos · São Paulo, Brasil", omitiendo lo que falte; `null` si no hay nada. */
export function formatConcertPlace(entry: Pick<ConcertEntryDto, "venue" | "city" | "country">, locale: string): string | null {
  const area = [entry.city, entry.country ? countryName(entry.country, locale) : null].filter(Boolean).join(", ");
  const place = [entry.venue, area || null].filter(Boolean).join(" · ");
  return place || null;
}

/** Año del grupo en Mis conciertos. */
export function concertYear(value: string): string {
  return value.slice(0, 4);
}

/** Registros agrupados por año, en el orden en que llegan (el servidor ya los ordena por fecha descendente). */
export function groupConcertsByYear<T extends { eventDate: string }>(entries: readonly T[]): { year: string; entries: T[] }[] {
  const groups: { year: string; entries: T[] }[] = [];
  for (const entry of entries) {
    const year = concertYear(entry.eventDate);
    const last = groups.at(-1);
    if (last && last.year === year) last.entries.push(entry);
    else groups.push({ year, entries: [entry] });
  }
  return groups;
}
