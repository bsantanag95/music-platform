import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecentHeadlineWinner } from "./read";

const mocks = vi.hoisted(() => ({ getDiscographyMarks: vi.fn() }));
vi.mock("@/services/catalog/artist-discography-view", () => ({ getDiscographyMarks: mocks.getDiscographyMarks }));

const { getWinnerMarks, missingWinners, winnerAlbumIds } = await import("./personal");

const cover = (id: string) => ({ releaseGroupId: id, coverThumbUrl: null, coverResolved: true });
const albumWinner = (awardSlug: string, year: number, albumId: string): RecentHeadlineWinner => ({
  awardSlug,
  year,
  category: { es: "Álbum del año", en: "Album of the Year" },
  winner: {
    id: `${awardSlug}-${year}`,
    won: true,
    text: albumId,
    credit: null,
    subject: { kind: "release_group", album: { id: albumId, title: albumId, artistName: null, cover: cover(albumId) } },
  },
});
const textWinner = (awardSlug: string, year: number): RecentHeadlineWinner => ({
  awardSlug,
  year,
  category: { es: "Álbum del año", en: "Album of the Year" },
  winner: { id: `${awardSlug}-${year}`, won: true, text: "Sin catálogo", credit: null, subject: null },
});

const winners = [
  albumWinner("grammy", 2026, "dtmf"),
  albumWinner("lo-nuestro", 2026, "dtmf"),
  albumWinner("brit-awards", 2026, "loving"),
  textWinner("mercury-prize", 2025),
  albumWinner("grammy", 2025, "cowboy"),
];

beforeEach(() => vi.clearAllMocks());

describe("winnerAlbumIds", () => {
  it("cuenta cada álbum una vez aunque gane en varios premios y omite los ganadores sin álbum", () => {
    expect(winnerAlbumIds(winners)).toEqual(["dtmf", "loving", "cowboy"]);
  });
});

describe("missingWinners", () => {
  it("deja los álbumes no escuchados, una vez cada uno, sin los ganadores sin álbum", () => {
    const result = missingWinners(winners, new Set(["loving"]));
    expect(result.map((w) => `${w.awardSlug}-${w.year}`)).toEqual(["grammy-2026", "grammy-2025"]);
  });

  it("con todo escuchado queda vacío", () => {
    expect(missingWinners(winners, new Set(["dtmf", "loving", "cowboy"]))).toEqual([]);
  });
});

describe("getWinnerMarks", () => {
  it("escuchado es una escucha o una valoración; pendiente solo si no lo escuchó", async () => {
    mocks.getDiscographyMarks.mockResolvedValue({
      listened: ["dtmf"],
      stars: { loving: 4 },
      detailedScores: {},
      favorites: ["cowboy"],
      pending: ["loving", "cowboy"],
      lists: {},
    });

    const marks = await getWinnerMarks("u1", ["dtmf", "loving", "cowboy"]);

    expect(mocks.getDiscographyMarks).toHaveBeenCalledWith("u1", ["dtmf", "loving", "cowboy"]);
    expect([...marks.heard].sort()).toEqual(["dtmf", "loving"]);
    expect([...marks.pending]).toEqual(["cowboy"]);
  });
});
