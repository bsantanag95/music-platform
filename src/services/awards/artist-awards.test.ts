import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import { groupArtistAwards } from "./artist-awards";

const row = (overrides: Record<string, unknown>) => ({
  id: "n",
  award_slug: "grammy",
  kind: "competition" as const,
  year: 2025,
  name_es: "Álbum del año",
  name_en: "Album of the Year",
  won: false,
  nominee_text: "Disco",
  album_id: null,
  album_title: null,
  ...overrides,
});

describe("groupArtistAwards", () => {
  it("agrupa por ceremonia en orden y cuenta ganados, nominaciones e incorporaciones", () => {
    const awards = groupArtistAwards([
      row({ id: "a", year: 2026, won: true, album_id: "rg", album_title: "Disco" }),
      row({ id: "b", year: 2026 }),
      row({ id: "c", award_slug: "latin-grammy", year: 2025, won: true }),
      row({ id: "d", award_slug: "grammy-hall-of-fame", kind: "hall_of_fame", year: 2024, won: true }),
    ]);
    expect(awards.ceremonies.map((c) => `${c.awardSlug} ${c.year} ${c.nominations.length}`)).toEqual([
      "grammy 2026 2",
      "latin-grammy 2025 1",
      "grammy-hall-of-fame 2024 1",
    ]);
    expect(awards.ceremonies[0]!.nominations[0]).toEqual({
      id: "a",
      category: { es: "Álbum del año", en: "Album of the Year" },
      won: true,
      nomineeText: "Disco",
      album: { id: "rg", title: "Disco" },
    });
    // La incorporación a un salón no cuenta como premio ganado ni como nominación.
    expect([awards.wins, awards.nominations, awards.inductions]).toEqual([2, 3, 1]);
  });

  it("sin filas no hay ceremonias", () => {
    expect(groupArtistAwards([])).toEqual({ ceremonies: [], wins: 0, nominations: 0, inductions: 0 });
  });
});
