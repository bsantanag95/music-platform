import type { ArtistDiscographyItem } from "@/services/catalog/artist-discography-view";
import type { DiscographySection } from "@/services/catalog/discography-sections";

// Buscador de la discografía del artista (openspec: add-discography-search, design D2). Filtra en
// el cliente las secciones que ya trae la página: sin request ni debounce.

/** Cantidad mínima de discos (todas las secciones) para ofrecer el buscador (design D6). */
export const DISCOGRAPHY_SEARCH_MIN_DISCS = 20;

/** Ligaduras y letras que NFD no descompone en letra base + marca. */
const FOLDED_LETTERS: Record<string, string> = { æ: "ae", œ: "oe", ø: "o", ß: "ss", ł: "l", đ: "d", þ: "th" };

/**
 * Texto comparable: minúsculas, sin acentos ni ligaduras, sin apóstrofos (rectos o tipográficos,
 * así "dont" encuentra "Don’t"), comillas tipográficas como rectas y espacios colapsados.
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[æœøßłđþ]/g, (letter) => FOLDED_LETTERS[letter] ?? letter)
    .replace(/['’‘´`ʼ]/g, "")
    .replace(/[“”«»„]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Un disco coincide si su título contiene la consulta; en Apariciones, también el artista
 * principal; y si la consulta es un año de cuatro cifras, también si el disco es de ese año.
 * `query` ya normalizada.
 */
export function matchesDisc(item: ArtistDiscographyItem, query: string, section: DiscographySection): boolean {
  if (!query) return false;
  if (normalizeForSearch(item.title).includes(query)) return true;
  if (section === "appearances" && item.primaryArtist && normalizeForSearch(item.primaryArtist.name).includes(query)) {
    return true;
  }
  return /^\d{4}$/.test(query) && item.year === Number(query);
}

export interface DiscographySearchResult {
  /** Secciones con coincidencias, en el orden del selector. */
  groups: { key: DiscographySection; items: ArtistDiscographyItem[] }[];
  /** Coincidencias por sección (cero incluido) para las pastillas. */
  counts: Partial<Record<DiscographySection, number>>;
  total: number;
}

export function searchDiscography(
  sections: { key: DiscographySection; items: ArtistDiscographyItem[] }[],
  rawQuery: string,
): DiscographySearchResult {
  const query = normalizeForSearch(rawQuery);
  const counts: Partial<Record<DiscographySection, number>> = {};
  const groups: DiscographySearchResult["groups"] = [];
  let total = 0;
  for (const section of sections) {
    const items = section.items.filter((item) => matchesDisc(item, query, section.key));
    counts[section.key] = items.length;
    total += items.length;
    if (items.length > 0) groups.push({ key: section.key, items });
  }
  return { groups, counts, total };
}
