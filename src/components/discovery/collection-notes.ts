import type { CollectionFamily } from "@/services/discovery/collections/families";

// Nota por disco en el detalle de una colección: por qué está ahí, en una línea bajo el artista. Es lo que hace que
// la lista de discos de una colección se lea como una muestra con su cartela y no como la lista de una persona.
// Módulo puro (fecha de hoy inyectable) para poder probarlo.

export type CollectionNote =
  | { kind: "anniversary"; years: number; date: string }
  | { kind: "date"; date: string }
  | { kind: "year"; year: number };

/**
 * - Efemérides con fecha completa: el aniversario que cumple en el año de la colección ("Cumple 70 años · 15 oct
 *   1956"). Sin fecha completa no hay aniversario que decir, y cae al año.
 * - Lanzamientos con fecha completa: la fecha (es lo que ordena lo nuevo y lo que viene).
 * - El resto: el año de lanzamiento.
 * `null` sin fecha ni año.
 */
export function collectionNote(
  family: CollectionFamily,
  release: { date: string | null; year: number | null } | undefined,
  today: Date = new Date(),
): CollectionNote | null {
  if (!release) return null;
  const full = release.date && /^\d{4}-\d{2}-\d{2}$/.test(release.date) ? release.date : null;
  if (family === "ephemeris" && full) {
    const years = today.getUTCFullYear() - Number(full.slice(0, 4));
    if (years > 0) return { kind: "anniversary", years, date: full };
  }
  if (family === "releases" && full) return { kind: "date", date: full };
  const year = release.year ?? (release.date ? Number(release.date.slice(0, 4)) : null);
  return year ? { kind: "year", year } : null;
}

/**
 * Nota de un álbum de una colección de premios: las categorías que ganó, las generales primero ("Álbum del año ·
 * Mejor álbum de música country"). Hasta `MAX_AWARD_NOTE` nombres y, si hay más, cuántas faltan ("+1"). `null` si no
 * ganó ninguna conocida.
 */
const MAX_AWARD_NOTE = 2;

export function awardNote(won: { name: { es: string; en: string } }[] | undefined, locale: string): string | null {
  if (!won || won.length === 0) return null;
  const english = locale.toLowerCase().startsWith("en");
  const names = won.slice(0, MAX_AWARD_NOTE).map((category) => (english ? category.name.en : category.name.es));
  const rest = won.length - names.length;
  return [...names, ...(rest > 0 ? [`+${rest}`] : [])].join(" · ");
}

/** Fecha larga con año ("2 de febrero de 2025"), en UTC. */
export function formatLongDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** Fecha corta con año ("15 oct 1956"), en UTC para que la zona horaria del servidor no corra el día. */
export function formatNoteDate(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
