// Fecha de un disco para mostrar (openspec: polish-song-appearances-versions): MusicBrainz da
// fechas parciales ("2025", "2025-06", "2025-06-06"); se muestra solo la precisión que hay.

export interface DiscDateParts {
  year: number;
  month: number | null;
  day: number | null;
}

export function parseDiscDate(date: string | null): DiscDateParts | null {
  const match = date?.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) return null;
  const month = match[2] ? Number(match[2]) : null;
  return {
    year: Number(match[1]),
    month,
    day: month !== null && match[3] ? Number(match[3]) : null,
  };
}

/** Fecha UTC para `Intl` (el día 1 si no hay día: nunca se muestra en ese caso). */
export function discDateValue(parts: DiscDateParts): Date {
  return new Date(Date.UTC(parts.year, (parts.month ?? 1) - 1, parts.day ?? 1));
}
