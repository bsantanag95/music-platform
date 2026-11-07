// Título sugerido de una tier list según su fuente (openspec: add-tier-list-lamina-phase2). Sin número, a diferencia del Top N: una tier
// list no tiene un tamaño fijo. El texto sale del traductor de `laminas.tier.titles`, así se puede probar sin la interfaz.

export type TierTitleTranslator = (key: string, values?: Record<string, string | number>) => string;

export type TierTitleSource =
  | { type: "discography"; artist: string }
  | { type: "album"; album: string }
  | { type: "list"; listTitle?: string }
  | {
      type: "ratings";
      kind: "release-group" | "recording";
      artist?: string;
      listenYear?: number;
      year?: number;
      decade?: string;
      genre?: string;
    };

export function suggestTierTitle(t: TierTitleTranslator, source: TierTitleSource): string {
  switch (source.type) {
    case "discography":
      return t("titles.discography", { artist: source.artist });
    case "album":
      return t("titles.album", { album: source.album });
    case "list":
      return source.listTitle ? t("titles.list", { list: source.listTitle }) : "";
    case "ratings": {
      const kind = source.kind;
      if (source.artist) return t("titles.artist", { kind, artist: source.artist });
      if (source.listenYear) return t("titles.listenYear", { year: source.listenYear });
      if (source.genre && source.year !== undefined) return t("titles.genreYear", { kind, genre: source.genre, year: source.year });
      if (source.genre && source.decade) return t("titles.genreDecade", { kind, genre: source.genre, decade: source.decade });
      if (source.genre) return t("titles.genre", { kind, genre: source.genre });
      if (source.year !== undefined) return t("titles.year", { kind, year: source.year });
      if (source.decade) return t("titles.decade", { kind, decade: source.decade });
      return t("titles.ratings", { kind });
    }
  }
}
