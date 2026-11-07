import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en/laminas.json";
import es from "../../../messages/es/laminas.json";
import { manualTitleSuggestions, suggestLaminaTitle, type SuggestedTitleInput, type TitleTranslator } from "./suggested-title";

const translator = (locale: "es" | "en") =>
  createTranslator({ locale, messages: { laminas: locale === "es" ? es : en }, namespace: "laminas" }) as unknown as TitleTranslator;

const base: SuggestedTitleInput = { format: "top10", entityType: "release-group", source: "ratings" };
const title = (input: Partial<SuggestedTitleInput>, locale: "es" | "en" = "es") => suggestLaminaTitle(translator(locale), { ...base, ...input });

describe("suggestLaminaTitle", () => {
  it.each<[Partial<SuggestedTitleInput>, string, string]>([
    [{ artist: "Iron Maiden", decade: "años 80" }, "Lo mejor de Iron Maiden en los años 80", "The best of Iron Maiden in the años 80"],
    [{ artist: "Iron Maiden", year: 1984 }, "Lo mejor de Iron Maiden en 1984", "The best of Iron Maiden in 1984"],
    [{ artist: "Iron Maiden" }, "Lo mejor de Iron Maiden", "The best of Iron Maiden"],
    [{ listenYear: 2026 }, "Lo mejor que escuché en 2026", "The best I heard in 2026"],
    [{ year: 2026 }, "Mis 10 discos de 2026", "My 10 albums of 2026"],
    [{ genre: "Metal", decade: "años 90", format: "top5" }, "Top 5 de Metal de los años 90", "Top 5 Metal of the años 90"],
    [{ decade: "años 90", format: "top5" }, "Top 5 de los años 90", "Top 5 of the años 90"],
    [{ genre: "Metal" }, "Mis 10 discos de Metal", "My 10 Metal albums"],
    [{ source: "favorites" }, "Mis 10 discos favoritos", "My 10 favorite albums"],
    [{}, "Mis 10 discos mejor valorados", "My 10 top rated albums"],
    [{ source: "list", listTitle: "Viaje", format: "top5" }, "Top 5 de Viaje", "Top 5 from Viaje"],
  ])("%j", (input, spanish, english) => {
    expect(title(input)).toBe(spanish);
    expect(title(input, "en")).toBe(english);
  });

  it("con canciones cambia el sustantivo y su concordancia", () => {
    expect(title({ entityType: "recording", year: 2026 })).toBe("Mis 10 canciones de 2026");
    expect(title({ entityType: "recording", source: "favorites" })).toBe("Mis 10 canciones favoritas");
    expect(title({ entityType: "recording" }, "en")).toBe("My 10 top rated songs");
  });

  it("la grilla son nueve", () => {
    expect(title({ format: "grid9", year: 2026 })).toBe("Mis 9 discos de 2026");
  });

  it("una lista sin elegir no sugiere nada", () => {
    expect(title({ source: "list" })).toBe("");
  });

  it("no pasa de 100 caracteres", () => {
    expect(title({ artist: "x".repeat(200) })).toHaveLength(100);
  });
});

describe("manualTitleSuggestions", () => {
  it("el año en curso y de siempre", () => {
    expect(manualTitleSuggestions(translator("es"), { format: "top5", entityType: "release-group", year: 2026 })).toEqual([
      "Mis 5 discos de 2026",
      "Mis 5 discos de siempre",
    ]);
  });
});
