// Normalización de texto para la búsqueda por tipo (openspec:
// redesign-scoped-search, capacidad search-query-matching).
//
// Es la ÚNICA normalización que usan la cobertura de términos, la detección
// del artista en Canciones y la redirección por coincidencia exacta: si cada
// uno normalizara a su manera, "Motörhead" podría ser exacto para uno y no
// para otro. En SQL, `search_normalize` (migración 0050) cubre mayúsculas y
// acentos; la puntuación la resuelve esta función antes de consultar.

/** Minúsculas, sin diacríticos, apóstrofos internos fuera, resto de puntuación a espacio. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/(\p{L})['’`´](\p{L})/gu, "$1$2")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Título base de una versión: sin sufijos entre paréntesis o corchetes
 * ("(live)", "[demo]", "(2011 remaster)") ni " - Live at …". Cualquier
 * versión cuenta como la misma canción; sin esto "Kiss of Death (live)"
 * quedaba como un grupo aparte, sin álbumes. Lo usan la búsqueda de Canciones
 * y sus sugerencias, para agrupar con el mismo criterio.
 */
export function baseSongTitle(title: string): string {
  let base = title.trim();
  let previous = "";
  while (base !== previous) {
    previous = base;
    base = base
      .replace(/\s*[([][^()[\]]*[)\]]\s*$/u, "")
      .replace(/\s+[-–—]\s+[^-–—]+$/u, "")
      .trim();
  }
  return base || title.trim();
}

export function tokenize(value: string): string[] {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(" ") : [];
}

/**
 * Nivel de coincidencia de un nombre con la consulta, del mejor al peor:
 * 0 exacta, 1 la consulta aparece como palabras completas contiguas, 2 el
 * nombre empieza por la consulta, 3 cualquier otra (subcadena a mitad de
 * palabra, similitud). Así "Icon" < "Despised Icon" < "Ennio Morricone".
 */
export type MatchTier = 0 | 1 | 2 | 3;

export function matchTier(name: string, query: string): MatchTier {
  const normalizedName = normalizeSearchText(name);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 3;
  if (normalizedName === normalizedQuery) return 0;
  if (` ${normalizedName} `.includes(` ${normalizedQuery} `)) return 1;
  if (normalizedName.startsWith(normalizedQuery)) return 2;
  return 3;
}

export function isExactMatch(name: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  return normalizedQuery.length > 0 && normalizeSearchText(name) === normalizedQuery;
}

/** Escapa un literal para `LIKE` (el escape por defecto de PostgreSQL es la barra invertida). */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const EXPLICIT_SEPARATOR = /\s+[-–—]\s+/;

/**
 * Separador explícito opcional "A - B" (guion con espacios a ambos lados; un
 * guion pegado como en "Jay-Z" no cuenta). Devuelve null si no hay separador
 * o si algún lado queda vacío.
 */
export function splitExplicit(query: string): { left: string; right: string } | null {
  const match = EXPLICIT_SEPARATOR.exec(query);
  if (!match) return null;
  const left = query.slice(0, match.index).trim();
  const right = query.slice(match.index + match[0].length).trim();
  if (!normalizeSearchText(left) || !normalizeSearchText(right)) return null;
  return { left, right };
}

/**
 * Texto de la consulta sin el separador explícito: la cobertura trata
 * "KISS - Destroyer" igual que "KISS Destroyer".
 */
export function withoutSeparator(query: string): string {
  const split = splitExplicit(query);
  return split ? `${split.left} ${split.right}` : query;
}
