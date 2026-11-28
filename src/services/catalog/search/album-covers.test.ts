import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SongGroupResult } from "./types";

const select = vi.fn();
vi.mock("@/db", () => ({ db: { select: (...args: unknown[]) => select(...args) } }));
const { withAlbumCovers } = await import("./album-covers");

function rowsQuery(rows: unknown[]) {
  return { from: () => ({ where: vi.fn().mockResolvedValue(rows) }) };
}

const album = (id: string) => ({ id, mbid: null, title: id, category: "studio" as const, year: 1979, coverThumbUrl: null, coverResolved: false });
const group = (key: string, albums: ReturnType<typeof album>[]): SongGroupResult => ({
  kind: "song",
  key,
  title: key,
  artistName: null,
  recordingId: null,
  mbid: null,
  albums,
  query: key,
});

describe("withAlbumCovers", () => {
  beforeEach(() => select.mockReset());

  it("lee la carátula de todos los discos de todos los grupos en una sola consulta", async () => {
    select.mockReturnValue(
      rowsQuery([
        { id: "a", coverThumbUrl: "ua", coverCheckedAt: null, coverBlockedAt: null },
        { id: "b", coverThumbUrl: null, coverCheckedAt: null, coverBlockedAt: null },
      ]),
    );
    const [first, second] = await withAlbumCovers([group("x", [album("a"), album("b")]), group("y", [album("a")])]);
    expect(select).toHaveBeenCalledTimes(1);
    expect(first!.albums[0]).toMatchObject({ coverThumbUrl: "ua", coverResolved: true });
    expect(first!.albums[1]).toMatchObject({ coverThumbUrl: null, coverResolved: false });
    expect(second!.albums[0]).toMatchObject({ coverThumbUrl: "ua", coverResolved: true });
  });

  it("sin discos no consulta", async () => {
    const results = [group("x", [])];
    expect(await withAlbumCovers(results)).toBe(results);
    expect(select).not.toHaveBeenCalled();
  });
});
