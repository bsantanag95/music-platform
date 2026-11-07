import { describe, expect, it } from "vitest";
import { suggestTierTitle, type TierTitleTranslator } from "./tier-title";

// Un traductor que muestra la clave y los valores: prueba qué título se elige, no su redacción.
const t: TierTitleTranslator = (key, values = {}) => `${key}(${Object.values(values).join("|")})`;

describe("suggestTierTitle", () => {
  it("usa el artista, el disco o la lista de la fuente", () => {
    expect(suggestTierTitle(t, { type: "discography", artist: "Black Sabbath" })).toBe("titles.discography(Black Sabbath)");
    expect(suggestTierTitle(t, { type: "album", album: "Paranoid" })).toBe("titles.album(Paranoid)");
    expect(suggestTierTitle(t, { type: "list", listTitle: "Viaje" })).toBe("titles.list(Viaje)");
    expect(suggestTierTitle(t, { type: "list" })).toBe("");
  });

  it("en valoraciones manda el artista, después el año de escucha, el género con el período y el período", () => {
    const base = { type: "ratings", kind: "recording" } as const;
    expect(suggestTierTitle(t, { ...base, artist: "Ozzy", decade: "los 80" })).toBe("titles.artist(recording|Ozzy)");
    expect(suggestTierTitle(t, { ...base, listenYear: 2025, genre: "Rock" })).toBe("titles.listenYear(2025)");
    expect(suggestTierTitle(t, { ...base, genre: "Rock", decade: "los 90" })).toBe("titles.genreDecade(recording|Rock|los 90)");
    expect(suggestTierTitle(t, { ...base, genre: "Rock", year: 1999 })).toBe("titles.genreYear(recording|Rock|1999)");
    expect(suggestTierTitle(t, { ...base, genre: "Rock" })).toBe("titles.genre(recording|Rock)");
    expect(suggestTierTitle(t, { ...base, year: 1999 })).toBe("titles.year(recording|1999)");
    expect(suggestTierTitle(t, { ...base, decade: "los 90" })).toBe("titles.decade(recording|los 90)");
    expect(suggestTierTitle(t, { type: "ratings", kind: "release-group" })).toBe("titles.ratings(release-group)");
  });
});
