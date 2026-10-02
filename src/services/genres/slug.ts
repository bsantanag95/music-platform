// Slugs de género (openspec: add-genre-taxonomy, design D3). Uno solo por género, en inglés,
// derivado del nombre de MusicBrainz y estable por MBID: es la clave de la URL, de la API y de la
// identidad musical. A diferencia de los slugs del catálogo (ADR 0022) se guarda y no lleva id,
// porque la taxonomía es fija y la carga un script.

/** Formato que exige `chk_genre_slug` (migración 0056). */
export const GENRE_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Letras latinas que NFKD no descompone en base + diacrítico.
const LETTER_FOLDS: Record<string, string> = {
  ø: "o",
  æ: "ae",
  œ: "oe",
  ß: "ss",
  đ: "d",
  ð: "d",
  ł: "l",
  þ: "th",
  ı: "i",
};

/** Slug base de un nombre de MusicBrainz ("hip hop" → `hip-hop`, "r&b" → `r-and-b`); `""` si no queda nada. */
export function genreSlugBase(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[øæœßđðłþı]/g, (ch) => LETTER_FOLDS[ch] ?? ch)
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface SlugInput {
  mbid: string;
  name: string;
}

/**
 * Asigna slugs únicos. Conserva el slug anterior de cada MBID (un renombre en MusicBrainz no
 * rompe URLs ni la identidad); los géneros nuevos toman su slug base en orden de MBID y, si ya
 * está tomado, el primer sufijo `-2`, `-3`… libre. Un nombre sin letras ni dígitos latinos usa
 * `genre-<primeros 8 del MBID>`.
 */
export function assignGenreSlugs(genres: SlugInput[], previous: ReadonlyMap<string, string>): Map<string, string> {
  const result = new Map<string, string>();
  const taken = new Set<string>();

  for (const g of genres) {
    const kept = previous.get(g.mbid);
    if (kept && GENRE_SLUG_PATTERN.test(kept) && !taken.has(kept)) {
      result.set(g.mbid, kept);
      taken.add(kept);
    }
  }

  const pending = genres.filter((g) => !result.has(g.mbid)).sort((a, b) => a.mbid.localeCompare(b.mbid));
  for (const g of pending) {
    const base = genreSlugBase(g.name) || `genre-${g.mbid.slice(0, 8)}`;
    let slug = base;
    for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
    result.set(g.mbid, slug);
    taken.add(slug);
  }
  return result;
}
