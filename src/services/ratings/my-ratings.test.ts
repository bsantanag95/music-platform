import { describe, expect, it, vi } from "vitest";
import { listMyRatings } from "./my-ratings";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

function mockCountQuery(count: number) {
  mocks.db.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      leftJoin: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count }]),
        }),
      }),
    }),
  });
}

function mockListQuery(rows: unknown[]) {
  const offset = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn(() => ({ offset }));
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const leftJoin2 = vi.fn(() => ({ where }));
  const leftJoin1 = vi.fn(() => ({ leftJoin: leftJoin2 }));
  mocks.db.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({ leftJoin: leftJoin1 }),
  });
}

function mockYearsQuery(years: (number | null)[]) {
  const orderBy = vi.fn().mockResolvedValue(years.map((year) => ({ year })));
  const where = vi.fn(() => ({ orderBy }));
  const leftJoin2 = vi.fn(() => ({ where }));
  const leftJoin1 = vi.fn(() => ({ leftJoin: leftJoin2 }));
  mocks.db.select.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({ leftJoin: leftJoin1 }),
  });
}

function mockAllQueries(count: number, rows: unknown[], years: (number | null)[] = []) {
  mockCountQuery(count);
  mockListQuery(rows);
  mockYearsQuery(years);
}

const userId = "00000000-0000-4000-8000-000000000001";

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-aaaaaaaaaaaa",
    stars: "4.0",
    detailedScore: 78,
    updatedAt: new Date("2026-01-01"),
    artistId: null,
    releaseGroupId: "00000000-0000-4000-8000-bbbbbbbbbbbb",
    recordingId: null,
    releaseTitle: "The Dark Side of the Moon",
    releaseCover: "https://example.com/cover.jpg",
    releaseYear: 1973,
    recordingTitle: null,
    creditedArtist: "Pink Floyd",
    creditedArtistId: "00000000-0000-4000-8000-cccccccccccc",
    recordingCover: null,
    recordingYear: null,
    ...overrides,
  };
}

describe("listMyRatings", () => {
  it("devuelve solo filas del usuario con paginación y facetas", async () => {
    const row = makeRow();
    mockAllQueries(1, [row], [1973]);
    const result = await listMyRatings(userId, 1, 20);
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.targetType).toBe("release-group");
    expect(result.items[0]!.target.title).toBe("The Dark Side of the Moon");
    expect(result.items[0]!.target.year).toBe(1973);
    expect(result.facets.years).toEqual([1973]);
    expect(result.hasNext).toBe(false);
  });

  it("indica hasNext cuando hay más filas que pageSize", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => makeRow({ id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}` }));
    mockAllQueries(21, rows, [1973]);
    const result = await listMyRatings(userId, 1, 20);
    expect(result.items).toHaveLength(20);
    expect(result.hasNext).toBe(true);
    expect(result.total).toBe(21);
  });

  it("serializa una canción con año del álbum más antiguo", async () => {
    const row = makeRow({
      id: "00000000-0000-4000-8000-dddddddddddd",
      releaseGroupId: null,
      recordingId: "00000000-0000-4000-8000-eeeeeeeeeeee",
      releaseTitle: null,
      releaseCover: null,
      releaseYear: null,
      recordingTitle: "Comfortably Numb",
      recordingCover: "https://example.com/rec-cover.jpg",
      recordingYear: 1979,
    });
    mockAllQueries(1, [row], [1979]);
    const result = await listMyRatings(userId);
    expect(result.items[0]!.targetType).toBe("recording");
    expect(result.items[0]!.target.title).toBe("Comfortably Numb");
    expect(result.items[0]!.target.year).toBe(1979);
    expect(result.items[0]!.target.coverThumbUrl).toBe("https://example.com/rec-cover.jpg");
  });

  it("rechaza paginación inválida", async () => {
    await expect(listMyRatings(userId, 0, 20)).rejects.toThrow("paginación");
    await expect(listMyRatings(userId, 1, 0)).rejects.toThrow("paginación");
    await expect(listMyRatings(userId, 1, 51)).rejects.toThrow("paginación");
  });

  it("rechaza un orden inválido", async () => {
    await expect(listMyRatings(userId, 1, 20, { sort: "invalid" as "best" })).rejects.toThrow("orden");
  });
});
