import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ readArtistDiscography: vi.fn() }));
vi.mock("@/services/catalog/ingest-discography", () => ({ readArtistDiscography: mocks.readArtistDiscography }));
vi.mock("@/services/catalog/cover-resolution", () => ({ isCoverResolved: () => true }));
vi.mock("@/db", () => ({ db: {} }));

import { listArtistJourneyAlbums } from "./artist-journey-albums";

function row(id: string, creditRole: "primary" | "featured") {
  return {
    id,
    mbid: null,
    title: `Disco ${id}`,
    category: "studio",
    firstReleaseDate: "1977-01-23",
    firstReleaseYear: 1977,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    coverThumbUrl: null,
    creditRole,
  };
}

describe("listArtistJourneyAlbums", () => {
  it("devuelve solo los discos con crédito principal, en el formato del modal", async () => {
    mocks.readArtistDiscography.mockResolvedValue([row("a", "primary"), row("b", "featured")]);
    const albums = await listArtistJourneyAlbums("artista");
    expect(mocks.readArtistDiscography).toHaveBeenCalledWith("artista");
    expect(albums).toEqual([
      {
        id: "a",
        mbid: null,
        title: "Disco a",
        category: "studio",
        firstReleaseDate: "1977-01-23",
        firstReleaseYear: 1977,
        createdAt: "2026-01-01T00:00:00.000Z",
        coverThumbUrl: null,
        coverResolved: true,
      },
    ]);
  });
});
