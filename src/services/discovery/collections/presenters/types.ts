// Contrato de contexto de una colección (openspec: add-collection-presenters, ADR 0039). Un presentador describe cómo
// se explica una colección generada en su detalle: qué dice la cabecera, qué dice cada disco y cómo se agrupan. Devuelve
// **datos, no texto**: referencias a mensajes que se traducen al presentar (mismo principio que los títulos, ADR 0037).
// Módulo sin base de datos: lo importan los presentadores, el resolvedor de mensajes y la página.

import type { CollectionFamily } from "../families";

/** Fecha de un parámetro: se formatea al presentar, en UTC y con el idioma activo. */
export interface DatePart {
  /** `YYYY-MM-DD`. */
  date: string;
  style: "short" | "long" | "day-month" | "month-year";
}

/** Texto que el catálogo guarda en los dos idiomas (p. ej. el nombre de una categoría de premios). */
export interface LocalizedText {
  es: string;
  en: string;
}

export type MessageParam = string | number | DatePart | LocalizedText;

/** Una cadena sin traducir: clave dentro de `catalog.explore.collectionContext` y sus parámetros. */
export interface MessageRef {
  key: string;
  params?: Record<string, MessageParam>;
}

export interface ContextGroup {
  /** Encabezado del grupo; sin él, el grupo se pinta sin encabezado. */
  label?: MessageRef;
  /** Ids de release-group, en el orden de la lista. */
  albumIds: string[];
}

/**
 * Lo que una colección dice de sí misma en su detalle. NO puede elegir los discos, cambiar su orden ni describir
 * componentes: eso es de `plan()` y de la interfaz.
 */
export interface CollectionContext {
  /** La frase de la cabecera. */
  summary?: MessageRef;
  link?: { href: string; label: MessageRef };
  /** Cartela de cada disco (id del release-group), en una línea bajo el artista. */
  notes: Map<string, MessageRef>;
  /** Partición de los discos; ausente = una sola rejilla. */
  groups?: ContextGroup[];
  /** Número de orden sobre la carátula. Solo cuando el orden es un ranking. */
  numbered: boolean;
}

export const EMPTY_CONTEXT: CollectionContext = { notes: new Map(), numbered: false };

export function emptyContext(): CollectionContext {
  return { notes: new Map(), numbered: false };
}

export interface PresenterInput {
  templateKey: string | null;
  periodKey: string | null;
  family: CollectionFamily;
  /** Discos de la lista (ids de release-group), en su orden. */
  albumIds: string[];
  /** Hoy en UTC; inyectable para que las cartelas relativas se prueben sin reloj. */
  today: Date;
}

/** Devuelve el contexto, o `null` para abstenerse y que la resolución siga con el siguiente nivel. */
export type CollectionPresenter = (input: PresenterInput) => Promise<CollectionContext | null>;
