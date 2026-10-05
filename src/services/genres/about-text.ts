import { GENRE_ABOUT_EXCERPT_CHARS } from "./constants";

// Reglas puras de "Sobre el género" (openspec: redesign-genre-page, capability `genre-about`, ADR
// 0027): elección del idioma con respaldo y recorte del primer párrafo. Sin base de datos, para que
// las usen el servicio y los componentes.

export type AboutLocale = "es" | "en";

export interface StoredAboutText {
  locale: string;
  summary: string | null;
  summaryTitle: string | null;
  summaryUrl: string | null;
}

export interface GenreAbout {
  /** Idioma del texto mostrado (puede no ser el de la ruta: respaldo en el otro idioma). */
  language: AboutLocale;
  /** El texto no está en el idioma pedido y la interfaz debe indicar cuál es. */
  isFallback: boolean;
  /** Título del artículo de Wikipedia (puede diferir del nombre mostrado del género). */
  title: string;
  url: string;
  /** Primer párrafo, cortado en límite de oración. */
  excerpt: string;
  /** El resto del texto, para el desplegable; `null` si el texto cabe en el primer párrafo. */
  rest: string | null;
}

const SENTENCE_END = /[.!?…]["»”')\]]?\s+(?=[A-ZÁÉÍÓÚÜÑ¿¡0-9"«“(])/g;
/** Un corte a menos de esto dejaría un párrafo pobre: se prefiere cortar en un espacio. */
const MIN_EXCERPT_CHARS = 200;

/**
 * Separa el primer párrafo (hasta `max` caracteres, cortado en el último límite de oración) del resto.
 * Si el primer párrafo cabe entero, el resto son los demás párrafos. Sin límite de oración utilizable
 * corta en el último espacio y agrega «…».
 */
export function splitAboutText(text: string, max = GENRE_ABOUT_EXCERPT_CHARS): { excerpt: string; rest: string | null } {
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const first = paragraphs[0] ?? "";
  const others = paragraphs.slice(1);

  if (first.length <= max) {
    return { excerpt: first, rest: others.length > 0 ? others.join("\n\n") : null };
  }

  let cut = -1;
  for (const match of first.matchAll(SENTENCE_END)) {
    const end = (match.index ?? 0) + match[0].trimEnd().length;
    if (end <= max) cut = end;
    else break;
  }
  if (cut < MIN_EXCERPT_CHARS) {
    const space = first.lastIndexOf(" ", max);
    const end = space > MIN_EXCERPT_CHARS ? space : max;
    const rest = [first.slice(end).trim(), ...others].filter(Boolean).join("\n\n");
    return { excerpt: `${first.slice(0, end).trimEnd()}…`, rest: rest || null };
  }
  const rest = [first.slice(cut).trim(), ...others].filter(Boolean).join("\n\n");
  return { excerpt: first.slice(0, cut).trim(), rest: rest || null };
}

/**
 * Elige el texto del idioma pedido o, si falta, el del otro idioma indicando cuál es. Un idioma sin
 * resumen (solo descripción) no cuenta como texto. `null` si ningún idioma tiene resumen.
 */
export function pickAboutText(rows: readonly StoredAboutText[], locale: AboutLocale): GenreAbout | null {
  const usable = rows.filter((r) => r.summary && r.summaryUrl && (r.locale === "es" || r.locale === "en"));
  const wanted = usable.find((r) => r.locale === locale);
  const chosen = wanted ?? usable[0];
  if (!chosen || !chosen.summary || !chosen.summaryUrl) return null;
  const { excerpt, rest } = splitAboutText(chosen.summary);
  return {
    language: chosen.locale as AboutLocale,
    isFallback: chosen.locale !== locale,
    title: chosen.summaryTitle ?? chosen.summaryUrl,
    url: chosen.summaryUrl,
    excerpt,
    rest,
  };
}
