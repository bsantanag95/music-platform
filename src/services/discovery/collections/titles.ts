// Títulos localizados de las colecciones generadas (openspec: localize-collection-titles, ADR 0037).
//
// El título de una colección generada es función pura de `(template_key, period_key)` y del idioma: el
// período ya guarda el año, el mes, la semana, la familia de géneros o el premio. Por eso no se persiste
// ninguna traducción; `user_list.title` queda como título canónico en español y como respaldo.
//
// Módulo puro, sin base de datos y sin JSON de mensajes: lo usan servicios, páginas de servidor y componentes
// de cliente (guardadas), así que no arrastra el catálogo de textos completo. Las pruebas comprueban que los
// nombres de familia coinciden con `messages/{es,en}/catalog.json`.

export type TitleLocale = "es" | "en";

/** Referencia a la plantilla y al período de una colección generada. */
export interface GeneratedRef {
  templateKey: string;
  periodKey: string;
}

/** Idioma de títulos para un locale de la app (`es` por defecto: es el idioma canónico del título guardado). */
export function titleLocaleOf(locale: string): TitleLocale {
  return locale.toLowerCase().startsWith("en") ? "en" : "es";
}

const AWARD_NAMES: Record<string, string> = { grammy: "Grammy" };

/** Nombres de las familias de géneros por idioma (iguales a `catalog.genres.families`). */
export const FAMILY_NAMES: Record<TitleLocale, Record<string, string>> = {
  es: {
    rock: "Rock",
    metal: "Metal",
    punk: "Punk y hardcore",
    pop: "Pop",
    electronic: "Electrónica",
    "hip-hop": "Hip hop",
    rnb: "R&B, soul y funk",
    jazz: "Jazz",
    blues: "Blues",
    folk: "Folk y cantautor",
    country: "Country",
    classical: "Clásica",
    experimental: "Experimental",
    ambient: "Ambient y new age",
    caribbean: "Reggae y Caribe",
    latin: "Latina",
    brazilian: "Brasileña",
    spoken: "Palabra y escena",
    religious: "Religiosa",
    world: "Del mundo",
  },
  en: {
    rock: "Rock",
    metal: "Metal",
    punk: "Punk & hardcore",
    pop: "Pop",
    electronic: "Electronic",
    "hip-hop": "Hip hop",
    rnb: "R&B, soul & funk",
    jazz: "Jazz",
    blues: "Blues",
    folk: "Folk & singer-songwriter",
    country: "Country",
    classical: "Classical",
    experimental: "Experimental",
    ambient: "Ambient & new age",
    caribbean: "Reggae & Caribbean",
    latin: "Latin",
    brazilian: "Brazilian",
    spoken: "Spoken word & stage",
    religious: "Religious",
    world: "World",
  },
};

type Fill = (values: Record<string, string>) => string;
const fill =
  (pattern: string): Fill =>
  (values) =>
    pattern.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? "");

/** Plantillas de título por idioma y plantilla. Marcadores: `{year}`, `{month}`, `{quarter}`, `{family}`, `{award}`. */
export const TITLE_PATTERNS: Record<TitleLocale, Record<string, string>> = {
  es: {
    "new-releases": "Novedades esenciales",
    upcoming: "Lo que viene",
    "one-per-decade": "Un disco por década",
    "grammy-winners": "Ganadores del {award} {year}",
    anniversaries: "Cumplen años en {month} de {year}",
    "genre-spotlight": "Para entrar a {family}",
    "top-rated-quarter": "Mejor valorados del {quarter}.º trimestre de {year}",
    "most-reviewed-month": "Lo más reseñado de {month} de {year}",
  },
  en: {
    "new-releases": "Essential new releases",
    upcoming: "What's coming",
    "one-per-decade": "One album per decade",
    "grammy-winners": "{award} winners {year}",
    anniversaries: "Anniversaries in {month} {year}",
    "genre-spotlight": "Getting into {family}",
    "top-rated-quarter": "Top rated of Q{quarter} {year}",
    "most-reviewed-month": "Most reviewed in {month} {year}",
  },
};

function monthName(year: number, month: number, locale: TitleLocale): string {
  const name = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return name;
}

/** Interpreta el período de cada plantilla; `null` si no cumple el formato esperado. */
function valuesFor(templateKey: string, periodKey: string, locale: TitleLocale): Record<string, string> | null {
  switch (templateKey) {
    case "new-releases":
    case "upcoming":
    case "one-per-decade":
      return {};
    case "grammy-winners": {
      const match = /^([a-z0-9-]+)-(\d{4})$/.exec(periodKey);
      if (!match) return null;
      return { award: AWARD_NAMES[match[1]!] ?? match[1]!, year: match[2]! };
    }
    case "anniversaries":
    case "most-reviewed-month": {
      const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(periodKey);
      if (!match) return null;
      return { year: match[1]!, month: monthName(Number(match[1]), Number(match[2]), locale) };
    }
    case "top-rated-quarter": {
      const match = /^(\d{4})-Q([1-4])$/.exec(periodKey);
      if (!match) return null;
      return { year: match[1]!, quarter: match[2]! };
    }
    case "genre-spotlight": {
      const match = /^\d{4}-W\d{2}-([a-z-]+)$/.exec(periodKey);
      if (!match) return null;
      return { family: FAMILY_NAMES[locale][match[1]!] ?? match[1]! };
    }
    default:
      return null;
  }
}

/**
 * Título de una colección generada en el idioma pedido. Si la plantilla no existe o el período no se puede
 * interpretar devuelve `fallback` (el título guardado): nunca falla ni muestra una clave cruda.
 */
export function collectionTitle(
  templateKey: string | null | undefined,
  periodKey: string | null | undefined,
  locale: string,
  fallback: string,
): string {
  if (!templateKey || !periodKey) return fallback;
  const lang = titleLocaleOf(locale);
  const pattern = TITLE_PATTERNS[lang][templateKey];
  const values = pattern ? valuesFor(templateKey, periodKey, lang) : null;
  if (!pattern || !values) return fallback;
  return fill(pattern)(values);
}

/** Nombre del dueño de una colección generada: la plataforma (no un usuario). */
export const PLATFORM_OWNER_NAME: Record<TitleLocale, string> = { es: "Exploración", en: "Explore" };
