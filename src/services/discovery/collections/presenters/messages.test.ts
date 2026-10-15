import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import catalogEn from "../../../../../messages/en/catalog.json";
import catalogEs from "../../../../../messages/es/catalog.json";
import { CONTEXT_MESSAGE_KEYS, type ContextMessageKey } from "./keys";

// Cada texto de los presentadores se formatea de verdad con ICU (plurales, números, parámetros) en los dos idiomas:
// un mensaje mal escrito o un parámetro que falta fallan aquí y no en pantalla.

const SAMPLE: Record<ContextMessageKey, Record<string, string | number>> = {
  anniversary: { years: 70, date: "15 oct 1956" },
  date: { date: "15 oct 1956" },
  year: { year: "1956" },
  awardsSummary: { award: "Grammy", year: "2025", date: "2 de febrero de 2025" },
  awardsLink: {},
  awardsWon1: { a: "Álbum del año" },
  awardsWon2: { a: "Álbum del año", b: "Mejor álbum de country" },
  awardsWonMore: { a: "Álbum del año", b: "Mejor álbum de country", more: 1 },
  newReleasesSummary: { days: 90, from: "17 jul", to: "14 oct" },
  newReleasesSummaryNoRange: { days: 90 },
  newReleasesToday: {},
  newReleasesYesterday: {},
  newReleasesDaysAgo: { days: 5, date: "9 oct" },
  newReleasesWeeksAgo: { weeks: 3, date: "22 sep" },
  monthHeading: { month: "Octubre de 2026" },
  upcomingSummary: { from: "23 oct", to: "5 dic" },
  upcomingSummaryNoRange: {},
  upcomingToday: {},
  upcomingTomorrow: {},
  upcomingDaysIn: { days: 9, date: "23 oct" },
  upcomingWeeksIn: { weeks: 3, date: "4 nov" },
  anniversariesSummary: { month: "octubre de 2026", from: 20, to: 70 },
  anniversariesSummarySingle: { years: 50, month: "octubre de 2026" },
  genreSpotlightSummary: { era: 5, genre: "Punk y hardcore" },
  genreEra: { from: "1990", to: "1994", year: "1992" },
  decadeSummary: {},
  decadeNote: { decade: "1990", year: "1994" },
  decadeNoteExact: { decade: "2020" },
  topRatedSummary: { quarter: "4", year: "2026", min: 3 },
  topRatedNote: { average: 4.5, count: 12 },
  mostReviewedSummary: { month: "octubre de 2026" },
  mostReviewedNote: { count: 12 },
};

const translator = (locale: "es" | "en") =>
  createTranslator({
    locale,
    messages: (locale === "es" ? catalogEs : catalogEn) as never,
    namespace: "explore.collectionContext" as never,
  }) as unknown as (key: string, values?: Record<string, string | number>) => string;

describe("textos de los presentadores, formateados", () => {
  it("hay valores de ejemplo para todas las claves", () => {
    expect(Object.keys(SAMPLE).sort()).toEqual([...CONTEXT_MESSAGE_KEYS].sort());
  });

  it.each(["es", "en"] as const)("toda clave se formatea en %s sin errores y sin dejar marcadores", (locale) => {
    const t = translator(locale);
    for (const key of CONTEXT_MESSAGE_KEYS) {
      const text = t(key, SAMPLE[key]);
      expect(text, `${locale}.${key}`).toBeTruthy();
      expect(text, `${locale}.${key}`).not.toMatch(/[{}]/);
      expect(text, `${locale}.${key}`).not.toContain("collectionContext");
    }
  });

  it("el promedio usa el separador decimal del idioma (4,5 / 4.5) y los plurales concuerdan", () => {
    expect(translator("es")("topRatedNote", { average: 4.5, count: 12 })).toBe("★ 4,5 · 12 valoraciones");
    expect(translator("en")("topRatedNote", { average: 4.5, count: 12 })).toBe("★ 4.5 · 12 ratings");
    expect(translator("es")("topRatedNote", { average: 4, count: 1 })).toBe("★ 4,0 · 1 valoración");
    expect(translator("es")("mostReviewedNote", { count: 1 })).toBe("1 reseña");
    expect(translator("en")("mostReviewedNote", { count: 1 })).toBe("1 review");
    expect(translator("es")("newReleasesWeeksAgo", { weeks: 1, date: "9 oct" })).toBe("Hace 1 semana · 9 oct");
    expect(translator("es")("upcomingWeeksIn", { weeks: 3, date: "4 nov" })).toBe("Sale en 3 semanas · 4 nov");
  });

  it("las frases dicen lo que prometen las especificaciones", () => {
    expect(translator("es")("decadeNote", { decade: "1990", year: "1994" })).toBe("Década de 1990 · 1994");
    expect(translator("en")("decadeNote", { decade: "1990", year: "1994" })).toBe("1990s · 1994");
    expect(translator("es")("decadeNoteExact", { decade: "2020" })).toBe("Década de 2020");
    expect(translator("en")("decadeNoteExact", { decade: "2020" })).toBe("2020s");
    expect(translator("es")("genreEra", { from: "1990", to: "1994", year: "1992" })).toBe("Era 1990–1994 · 1992");
    expect(translator("es")("upcomingDaysIn", { days: 9, date: "24 oct" })).toBe("Sale en 9 días · 24 oct");
  });
});
