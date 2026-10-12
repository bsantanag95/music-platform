// Períodos, nombres y reglas de calendario puras de las plantillas (openspec: add-day-zero-collections,
// ADR 0035). Sin base de datos: las comparten las plantillas y sus pruebas.

export const EVERGREEN = "evergreen";

export const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Semana ISO 8601 (UTC) de `now`, como `AAAA-Www` (el año es el de la semana ISO, no el calendario). */
export function isoWeekKey(now: Date): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekday = date.getUTCDay() || 7; // lunes = 1 … domingo = 7
  date.setUTCDate(date.getUTCDate() + 4 - weekday); // el jueves de esa semana fija el año ISO
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Semanas completas desde el lunes 1970-01-05: crece sin saltos entre años, para rotar. */
export function weekNumber(now: Date): number {
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((day - Date.UTC(1970, 0, 5)) / (7 * DAY_MS));
}

/** Clave de período mensual `AAAA-MM`. */
export const monthKey = (now: Date) =>
  `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

/**
 * Elige hasta `max` elementos repartidos de forma pareja a lo largo de `items` (conserva el primero y el
 * último). Con `max` o menos elementos devuelve todos.
 */
export function sampleEvenly<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  if (max <= 1) return items.slice(0, max);
  const picked: T[] = [];
  for (let i = 0; i < max; i += 1) picked.push(items[Math.round((i * (items.length - 1)) / (max - 1))]!);
  return picked;
}

/** Primer año de la era (de `eraYears` años) a la que pertenece `year`. */
export const eraOf = (year: number, eraYears: number) => Math.floor(year / eraYears) * eraYears;
