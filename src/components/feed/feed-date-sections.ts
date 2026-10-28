import type { FeedRow } from "./feed-grouping";

// Bloques de fecha de la lista de `/activity` (redesign-activity-page, D7). Son una ayuda de escaneo: cada fila
// conserva su fecha relativa. "Hoy" es el mismo día calendario en la zona horaria de la app; "Esta semana" y "Este
// mes" son ventanas móviles de 7 y 30 días hacia atrás desde `now`, no la semana o el mes calendario.
export type DateBucket = "today" | "week" | "month" | "earlier";
// "new": posterior a la última visita a `/me/feed` (redesign-feed-people, D7). Va antes de los bloques de fecha.
export type SectionBucket = DateBucket | "new";

export interface DateSectionRow {
  kind: "date-section";
  id: string;
  bucket: SectionBucket;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function calendarDay(date: Date, timeZone: string | undefined): string {
  // `en-CA` da AAAA-MM-DD, comparable como texto.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function dateBucket(iso: string, now: Date, timeZone?: string): DateBucket {
  const date = new Date(iso);
  if (calendarDay(date, timeZone) === calendarDay(now, timeZone)) return "today";
  const age = now.getTime() - date.getTime();
  if (age < 7 * DAY_MS) return "week";
  if (age < 30 * DAY_MS) return "month";
  return "earlier";
}

// Intercala un encabezado antes de la primera fila de cada bloque. Se calcula sobre la lista completa (todas las
// páginas cargadas), así que al sumar una página que continúa el último bloque el encabezado no se repite. Con
// `newSince`, las filas posteriores a esa marca van bajo "new" en lugar de su bloque de fecha.
export function withDateSections(
  rows: FeedRow[],
  now: Date,
  timeZone?: string,
  newSince?: string | null,
): (FeedRow | DateSectionRow)[] {
  const result: (FeedRow | DateSectionRow)[] = [];
  const newSinceMs = newSince ? new Date(newSince).getTime() : null;
  let previous: SectionBucket | null = null;
  for (const row of rows) {
    const bucket: SectionBucket =
      newSinceMs !== null && new Date(row.createdAt).getTime() > newSinceMs
        ? "new"
        : dateBucket(row.createdAt, now, timeZone);
    if (bucket !== previous) {
      // La posición en la key: si el orden no fuera estrictamente cronológico, un bloque podría repetirse.
      result.push({ kind: "date-section", id: `date-section-${bucket}-${result.length}`, bucket });
      previous = bucket;
    }
    result.push(row);
  }
  return result;
}
