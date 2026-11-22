import { describe, expect, it } from "vitest";
import { LIST_THEMES } from "@/services/lists/types";
import { COMMUNITY_LIST_THEMES, parseCommunityFilters, toDiscoverFilters } from "./community-filters";

// Filtro por tema de `/lists` (openspec: add-list-themes-phase1).
describe("community-filters: tema", () => {
  it("la copia local de los temas coincide con LIST_THEMES", () => {
    expect([...COMMUNITY_LIST_THEMES]).toEqual([...LIST_THEMES]);
  });

  it("un tema válido activa el modo explorar y llega al endpoint", () => {
    const filters = parseCommunityFilters({ theme: "recommendations" });
    expect(filters).toEqual({ q: undefined, type: undefined, theme: "recommendations", sort: undefined });
    expect(toDiscoverFilters(filters!)).toMatchObject({ theme: "recommendations" });
  });

  it("un tema desconocido se ignora", () => {
    expect(parseCommunityFilters({ theme: "recs" })).toBeUndefined();
    expect(parseCommunityFilters({ theme: "none" })).toBeUndefined();
  });
});
