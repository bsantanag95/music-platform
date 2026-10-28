import { describe, expect, it } from "vitest";
import { countBySegment, inSegment, sortByLatestRelease } from "./followed-artist-filters";
import type { FollowedArtistDto } from "@/lib/api/schemas";

const release = (date: string | null, year: number | null) => ({ title: "Disco", date, year, releaseGroupId: null });
const artist = (id: string, type: string, extra: Partial<FollowedArtistDto> = {}): FollowedArtistDto => ({
  id,
  name: id,
  type,
  photoUrl: null,
  ...extra,
});

describe("segmentos de artistas seguidos (redesign-artists-toolbar, D4)", () => {
  const list = [
    artist("banda", "group", { news: release("2026-11-14", 2026) }),
    artist("orquesta", "orchestra"),
    artist("solista", "person"),
    artist("otro", "other"),
  ];

  it("cuenta cada segmento sobre la lista completa", () => {
    expect(countBySegment(list)).toEqual({ all: 4, news: 1, groups: 2, solo: 1 });
  });

  it("grupos incluye orquestas y coros; otros tipos solo en Todos", () => {
    expect(list.filter((a) => inSegment(a, "groups")).map((a) => a.id)).toEqual(["banda", "orquesta"]);
    expect(inSegment(list[3]!, "solo")).toBe(false);
    expect(inSegment(list[3]!, "all")).toBe(true);
  });
});

describe("orden por último lanzamiento (D5)", () => {
  it("novedad primero, luego el último disco por fecha o año, y sin dato al final en su orden", () => {
    const sorted = sortByLatestRelease([
      artist("sin-dato-1", "group"),
      artist("viejo", "group", { latestRelease: release(null, 1987) }),
      artist("anunciado", "person", { news: release("2026-11-14", 2026) }),
      artist("sin-dato-2", "group"),
      artist("reciente", "group", { latestRelease: release("2024-05-03", 2024) }),
    ]);
    expect(sorted.map((a) => a.id)).toEqual(["anunciado", "reciente", "viejo", "sin-dato-1", "sin-dato-2"]);
  });
});
