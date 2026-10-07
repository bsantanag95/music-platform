import { describe, expect, it } from "vitest";
import type { LBFreshRelease } from "../listenbrainz/client";
import {
  ANONYMOUS_FAMILY_CAP,
  ANONYMOUS_PER_SIDE,
  addDays,
  classifyVerification,
  communityBoost,
  filterFeed,
  selectAnonymous,
  type RankCandidate,
} from "./release-calendar";

const TODAY = "2026-10-06";

function feedRow(overrides: Partial<LBFreshRelease> = {}): LBFreshRelease {
  return {
    artist_credit_name: "Banda",
    artist_mbids: ["a-1"],
    caa_id: 123,
    caa_release_mbid: "r-1",
    listen_count: 0,
    release_date: TODAY,
    release_group_mbid: "rg-1",
    release_group_primary_type: "Album",
    release_mbid: "r-1",
    release_name: "Disco",
    ...overrides,
  };
}

function candidate(overrides: Partial<RankCandidate> & { releaseGroupMbid: string }): RankCandidate {
  return {
    releaseDate: TODAY,
    artistMbids: [`artist-${overrides.releaseGroupMbid}`],
    listeners: 100,
    communityBoost: 0,
    family: null,
    ...overrides,
  };
}

describe("filterFeed", () => {
  it("se queda con álbumes y EPs con fecha exacta dentro de la ventana", () => {
    const rows = filterFeed(
      [
        feedRow({ release_group_mbid: "album" }),
        feedRow({ release_group_mbid: "ep", release_group_primary_type: "EP" }),
        feedRow({ release_group_mbid: "single", release_group_primary_type: "Single" }),
        feedRow({ release_group_mbid: "sin-tipo", release_group_primary_type: null }),
        feedRow({ release_group_mbid: "parcial", release_date: "2026-10" }),
        feedRow({ release_group_mbid: "viejo", release_date: addDays(TODAY, -31) }),
        feedRow({ release_group_mbid: "lejano", release_date: addDays(TODAY, 91) }),
      ],
      TODAY,
    );
    expect(rows.map((r) => r.releaseGroupMbid)).toEqual(["album", "ep"]);
  });

  it("marca la carátula según caa_id y deduplica por release-group", () => {
    const rows = filterFeed(
      [feedRow({ caa_id: null }), feedRow({ release_mbid: "otra-edicion" })],
      TODAY,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.hasCover).toBe(false);
  });
});

describe("classifyVerification", () => {
  const item = (overrides: Record<string, unknown> = {}) => ({ id: "rg-1", title: "Disco", ...overrides });

  it("excluye un disco con tipos secundarios", () => {
    expect(classifyVerification(item({ "secondary-types": ["Live"], "first-release-date": TODAY }), TODAY, TODAY))
      .toEqual({ status: "secondary_type", firstReleaseDate: TODAY });
  });

  it("excluye una reedición de un disco de 1994", () => {
    expect(classifyVerification(item({ "first-release-date": "1994-05-02" }), TODAY, TODAY).status).toBe("reissue");
    expect(classifyVerification(item({ "first-release-date": "1994" }), TODAY, TODAY).status).toBe("reissue");
  });

  it("acepta un disco nuevo y usa la fecha verificada", () => {
    expect(classifyVerification(item({ "first-release-date": "2026-11-13" }), "2026-11-12", TODAY)).toEqual({
      status: "valid",
      firstReleaseDate: "2026-11-13",
    });
  });

  it("sin fecha exacta en MusicBrainz usa la del feed", () => {
    expect(classifyVerification(item({ "first-release-date": "2026" }), "2026-11-12", TODAY)).toEqual({
      status: "valid",
      firstReleaseDate: "2026-11-12",
    });
  });
});

describe("communityBoost", () => {
  it("vale 0 sin señales, 1 con una y suma 0,5 por cada adicional hasta 2", () => {
    expect([0, 1, 2, 3, 4].map(communityBoost)).toEqual([0, 1, 1.5, 2, 2]);
  });
});

describe("selectAnonymous", () => {
  it("ordena por oyentes del artista y separa recientes de próximos", () => {
    const selection = selectAnonymous(
      [
        candidate({ releaseGroupMbid: "poco", listeners: 40, releaseDate: addDays(TODAY, 10) }),
        candidate({ releaseGroupMbid: "mucho", listeners: 350_000, releaseDate: addDays(TODAY, 20) }),
        candidate({ releaseGroupMbid: "hoy", listeners: 10 }),
        ...["x1", "x2", "x3"].map((id) => candidate({ releaseGroupMbid: id, releaseDate: addDays(TODAY, 5) })),
      ],
      TODAY,
    );
    expect(selection.map((c) => c.releaseGroupMbid)).toEqual(["hoy", "mucho", "x1", "x2", "x3", "poco"]);
  });

  it("el impulso de comunidad sube a un artista con menos oyentes", () => {
    const selection = selectAnonymous(
      [
        candidate({ releaseGroupMbid: "global", listeners: 999 }),
        candidate({ releaseGroupMbid: "local", listeners: 99, communityBoost: 2 }),
      ],
      TODAY,
    );
    expect(selection[0]!.releaseGroupMbid).toBe("local");
  });

  it("incluye un solo disco por artista en todo el riel", () => {
    const selection = selectAnonymous(
      [
        candidate({ releaseGroupMbid: "a", artistMbids: ["u2"], listeners: 500 }),
        candidate({ releaseGroupMbid: "b", artistMbids: ["u2"], listeners: 500, releaseDate: addDays(TODAY, 3) }),
        candidate({ releaseGroupMbid: "c", artistMbids: ["otro", "u2"], listeners: 900, releaseDate: addDays(TODAY, -3) }),
      ],
      TODAY,
    );
    expect(selection.map((c) => c.releaseGroupMbid)).toEqual(["c"]);
  });

  it("limita a 12 por lado y a 3 por familia de géneros", () => {
    const recent = Array.from({ length: 20 }, (_, i) =>
      candidate({ releaseGroupMbid: `r${i}`, listeners: 1000 - i, family: i < 6 ? "metal" : null }),
    );
    const selection = selectAnonymous(recent, TODAY);
    expect(selection).toHaveLength(ANONYMOUS_PER_SIDE);
    expect(selection.filter((c) => c.family === "metal")).toHaveLength(ANONYMOUS_FAMILY_CAP);
  });

  it("amplía los próximos a 90 días si a 60 hay menos de 4", () => {
    const pool = [
      ...["p1", "p2", "p3"].map((id) => candidate({ releaseGroupMbid: id, releaseDate: addDays(TODAY, 30) })),
      candidate({ releaseGroupMbid: "lejos", releaseDate: addDays(TODAY, 75) }),
    ];
    expect(selectAnonymous(pool, TODAY).map((c) => c.releaseGroupMbid)).toContain("lejos");

    const enough = [...pool, candidate({ releaseGroupMbid: "p4", releaseDate: addDays(TODAY, 40) })];
    expect(selectAnonymous(enough, TODAY).map((c) => c.releaseGroupMbid)).not.toContain("lejos");
  });
});
