// Nombres de género por idioma (openspec: add-genre-taxonomy, capability `genre-taxonomy`).
// Módulo puro, sin base de datos: lo usan servicios y componentes de servidor.

export type GenreLocale = "es" | "en";

/** Nombre a mostrar: en español la etiqueta de Wikidata (o la corrección curada), si no la de MusicBrainz. */
export function genreDisplayName(g: { name: string; nameEs: string | null }, locale: GenreLocale): string {
  return locale === "es" ? (g.nameEs ?? g.name) : g.name;
}

/** Idioma de géneros a partir del de la ruta (cualquier otro cae en español, el predeterminado). */
export function genreLocaleOf(locale: string): GenreLocale {
  return locale === "en" ? "en" : "es";
}
