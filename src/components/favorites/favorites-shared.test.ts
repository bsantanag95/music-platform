import { describe, expect, it } from "vitest";
import type { Favorite } from "@/lib/api/schemas";
import { adjustFavoriteFacets } from "./favorites-shared";

// openspec: redesign-favorites-summary-toolbar

const facets = {
  counts: { artist: 2, "release-group": 3, recording: 1 },
  audience: { private: 1, followers: 2, public: 3 },
};

function fav(targetType: Favorite["targetType"], audience: Favorite["audience"]): Favorite {
  return {
    id: `${targetType}-${audience}`,
    targetType,
    audience,
    createdAt: "2026-02-01T00:00:00.000Z",
    target: { id: "t", title: "T", coverThumbUrl: null },
  };
}

describe("adjustFavoriteFacets", () => {
  it("cambiar la audiencia mueve la cantidad entre cubos y no toca los tipos sin filtro", () => {
    const next = adjustFavoriteFacets(facets, "", [fav("artist", "followers")], "public");
    expect(next.audience).toEqual({ private: 1, followers: 1, public: 4 });
    expect(next.counts).toEqual(facets.counts);
  });

  it("con filtro de audiencia, salir del filtro baja el tipo y entrar lo sube", () => {
    const out = adjustFavoriteFacets(facets, "public", [fav("release-group", "public")], "private");
    expect(out.counts["release-group"]).toBe(2);
    expect(out.audience).toEqual({ private: 2, followers: 2, public: 2 });
    const back = adjustFavoriteFacets(facets, "public", [fav("recording", "followers")], "public");
    expect(back.counts.recording).toBe(2);
  });

  it("cambia varios a la vez (lote)", () => {
    const next = adjustFavoriteFacets(facets, "", [fav("artist", "followers"), fav("release-group", "followers")], "private");
    expect(next.audience).toEqual({ private: 3, followers: 0, public: 3 });
  });

  it("quitar resta del cubo de audiencia y del tipo", () => {
    const next = adjustFavoriteFacets(facets, "", [fav("release-group", "public")], null);
    expect(next.audience).toEqual({ private: 1, followers: 2, public: 2 });
    expect(next.counts).toEqual({ artist: 2, "release-group": 2, recording: 1 });
  });

  it("un favorito que ya tiene esa audiencia no cambia nada y nunca baja de cero", () => {
    expect(adjustFavoriteFacets(facets, "", [fav("artist", "public")], "public")).toEqual(facets);
    const zero = { counts: { artist: 0, "release-group": 0, recording: 0 }, audience: { private: 0, followers: 0, public: 0 } };
    expect(adjustFavoriteFacets(zero, "", [fav("artist", "public")], null).audience.public).toBe(0);
  });
});
