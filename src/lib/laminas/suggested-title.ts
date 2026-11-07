// Título sugerido de una Lámina (openspec: add-top-n-lamina-phase2): empuja el ritual ("Mis 10 discos de 2026") y siempre es
// editable. Módulo puro: recibe el traductor y las etiquetas ya resueltas por idioma.

const TITLE_MAX_LENGTH = 100;
const SIZE = { top5: 5, top10: 10, grid9: 9 } as const;

export type TitleKey =
  | "artistDecade"
  | "artistYear"
  | "artist"
  | "listenYear"
  | "year"
  | "genreDecade"
  | "decade"
  | "genre"
  | "favorites"
  | "ratings"
  | "list"
  | "allTime";

export type TitleTranslator = (key: `titles.${TitleKey}`, values: Record<string, string | number>) => string;

export interface SuggestedTitleInput {
  format: keyof typeof SIZE;
  entityType: "release-group" | "recording";
  source: "ratings" | "favorites" | "list";
  year?: number;
  /** Etiqueta de la década en minúsculas, como va en medio de una frase. */
  decade?: string;
  listenYear?: number;
  genre?: string;
  artist?: string;
  listTitle?: string;
}

function pick(input: SuggestedTitleInput): [TitleKey, Record<string, string | number>] | null {
  const { artist, year, decade, listenYear, genre, listTitle, source } = input;
  if (source === "list") return listTitle ? ["list", { list: listTitle }] : null;
  if (artist && decade) return ["artistDecade", { artist, decade }];
  if (artist && year !== undefined) return ["artistYear", { artist, year }];
  if (artist) return ["artist", { artist }];
  if (listenYear !== undefined) return ["listenYear", { year: listenYear }];
  if (year !== undefined) return ["year", { year }];
  if (genre && decade) return ["genreDecade", { genre, decade }];
  if (decade) return ["decade", { decade }];
  if (genre) return ["genre", { genre }];
  return [source, {}];
}

/** Título para la fuente y los filtros; vacío si todavía no hay de qué hablar (una lista sin elegir). */
export function suggestLaminaTitle(t: TitleTranslator, input: SuggestedTitleInput): string {
  const picked = pick(input);
  if (!picked) return "";
  const [key, values] = picked;
  return t(`titles.${key}`, { ...values, n: SIZE[input.format], kind: input.entityType }).slice(0, TITLE_MAX_LENGTH);
}

/** Sugerencias para quien arma a mano: el año en curso y de siempre. */
export function manualTitleSuggestions(t: TitleTranslator, input: Pick<SuggestedTitleInput, "format" | "entityType"> & { year: number }): string[] {
  const values = { n: SIZE[input.format], kind: input.entityType };
  return [t("titles.year", { ...values, year: input.year }), t("titles.allTime", values)];
}
