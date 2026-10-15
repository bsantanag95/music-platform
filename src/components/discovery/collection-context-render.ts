import type {
  CollectionContext,
  DatePart,
  LocalizedText,
  MessageParam,
  MessageRef,
} from "@/services/discovery/collections/presenters/types";

// Resolvedor de mensajes de un contexto de colección (openspec: add-collection-presenters, ADR 0039): convierte las
// referencias de un presentador (clave + parámetros) en el texto del idioma activo. Módulo puro; la traducción llega
// como función (la de `catalog.explore.collectionContext`) para poder probarlo sin next-intl.

/** La traducción del grupo `collectionContext`: `t(clave, valores)` y `t.has(clave)`. */
export interface ContextTranslator {
  (key: string, values?: Record<string, string | number>): string;
  has(key: string): boolean;
}

export interface ContextItem {
  id: string;
  target: { id: string };
}

export interface RenderedGroup<T extends ContextItem> {
  /** Encabezado del grupo; sin él, la sección se pinta sin título. */
  heading?: string;
  items: T[];
}

export interface RenderedContext<T extends ContextItem> {
  summary?: string;
  link?: { href: string; label: string };
  /** Cartela por id de ítem de la lista. */
  notes: Record<string, string>;
  /** `null` = una sola rejilla. */
  groups: RenderedGroup<T>[] | null;
  numbered: boolean;
}

const DATE_OPTIONS: Record<DatePart["style"], Intl.DateTimeFormatOptions> = {
  short: { day: "numeric", month: "short", year: "numeric" },
  long: { dateStyle: "long" },
  "day-month": { day: "numeric", month: "short" },
  "month-year": { month: "long", year: "numeric" },
};

/** Fecha en UTC con el idioma activo, para que la zona horaria del servidor no corra el día. */
export function formatContextDate(part: DatePart, locale: string): string {
  const text = new Intl.DateTimeFormat(locale, { ...DATE_OPTIONS[part.style], timeZone: "UTC" }).format(
    new Date(`${part.date}T00:00:00Z`),
  );
  // Un mes suelto es un encabezado: empieza en mayúscula ("Octubre de 2026").
  return part.style === "month-year" ? text.charAt(0).toLocaleUpperCase(locale) + text.slice(1) : text;
}

function isDatePart(value: MessageParam): value is DatePart {
  return typeof value === "object" && "date" in value;
}

function paramText(value: MessageParam, locale: string): string | number {
  if (typeof value === "string" || typeof value === "number") return value;
  if (isDatePart(value)) return formatContextDate(value, locale);
  const text = value as LocalizedText;
  return locale.toLowerCase().startsWith("en") ? text.en : text.es;
}

/** El texto de una referencia, o `null` si su clave no existe (nunca una clave cruda en pantalla). */
export function renderRef(message: MessageRef | undefined, t: ContextTranslator, locale: string): string | null {
  if (!message || !t.has(message.key)) return null;
  const values: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(message.params ?? {})) values[name] = paramText(value, locale);
  return t(message.key, values);
}

/**
 * El contexto ya como texto: resumen, enlace, cartela por ítem y grupos con sus ítems. Una referencia con clave
 * inexistente se omite (esa cartela, ese resumen o ese encabezado no aparecen).
 */
export function renderContext<T extends ContextItem>(
  context: CollectionContext,
  options: { t: ContextTranslator; locale: string; items: T[] },
): RenderedContext<T> {
  const { t, locale, items } = options;
  const byAlbum = new Map<string, T>();
  for (const item of items) if (!byAlbum.has(item.target.id)) byAlbum.set(item.target.id, item);

  const notes: Record<string, string> = {};
  for (const [albumId, message] of context.notes) {
    const item = byAlbum.get(albumId);
    const text = item ? renderRef(message, t, locale) : null;
    if (item && text) notes[item.id] = text;
  }

  const linkLabel = context.link ? renderRef(context.link.label, t, locale) : null;
  const summary = renderRef(context.summary, t, locale);

  const groups = context.groups
    ? context.groups.map<RenderedGroup<T>>((group) => ({
        ...(group.label ? { heading: renderRef(group.label, t, locale) ?? undefined } : {}),
        items: group.albumIds.flatMap((id) => (byAlbum.has(id) ? [byAlbum.get(id)!] : [])),
      }))
    : null;

  return {
    ...(summary ? { summary } : {}),
    ...(context.link && linkLabel ? { link: { href: context.link.href, label: linkLabel } } : {}),
    notes,
    groups,
    numbered: context.numbered,
  };
}
