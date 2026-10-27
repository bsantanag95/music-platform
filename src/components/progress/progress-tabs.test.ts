import { describe, expect, it } from "vitest";
import {
  parseFollowingFilters,
  parseOwnFilters,
  parseProgressTab,
  progressHref,
  progressTabFromLegacyCaminos,
} from "./progress-tabs";

describe("progress-tabs", () => {
  it("parsea las tres pestañas y cae a discographies", () => {
    expect(parseProgressTab("lists")).toBe("lists");
    expect(parseProgressTab("following")).toBe("following");
    expect(parseProgressTab(undefined)).toBe("discographies");
    expect(parseProgressTab("otra")).toBe("discographies");
    expect(parseProgressTab(["lists"])).toBe("discographies");
  });

  it("traduce la pestaña de /me/caminos a la de /me/progress", () => {
    expect(progressTabFromLegacyCaminos("mine")).toBe("lists");
    expect(progressTabFromLegacyCaminos("tracked")).toBe("following");
    expect(progressTabFromLegacyCaminos(undefined)).toBe("lists");
    expect(progressTabFromLegacyCaminos("otra")).toBe("lists");
  });

  it("arma el enlace con ?tab=", () => {
    expect(progressHref("following")).toBe("/me/progress?tab=following");
  });

  // openspec: refine-progress-page-phase1
  it("lee los filtros válidos de Discografías y Mis listas e ignora el resto", () => {
    expect(parseOwnFilters({ q: "  deep ", sort: "alpha", state: "archived", tab: "lists" })).toEqual({
      q: "deep",
      sort: "alpha",
      state: "archived",
    });
    expect(parseOwnFilters({ q: "   ", sort: "bogus", state: "x" })).toEqual({});
    expect(parseOwnFilters({ sort: "progress" })).toEqual({ sort: "progress" });
    expect(parseOwnFilters({ q: ["a", "b"] })).toEqual({});
    expect(parseOwnFilters({ q: "x".repeat(150) }).q).toHaveLength(100);
  });

  it("Listas que sigo no tiene estado y ordena por recientes o progreso", () => {
    expect(parseFollowingFilters({ q: "rock", sort: "progress", state: "archived" })).toEqual({
      q: "rock",
      sort: "progress",
    });
    expect(parseFollowingFilters({ sort: "alpha" })).toEqual({});
  });
});
