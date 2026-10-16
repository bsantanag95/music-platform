import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import {
  COLLECTION_TEMPLATES,
  COMMUNITY_WEIGHT,
  EVERGREEN,
  findTemplate,
  monthPeriodKey,
  monthStartIso,
  quarterPeriodKey,
  quarterStartIso,
  quarterTitle,
  popularMonthTitle,
} from "./templates";

const at = (iso: string) => new Date(iso);

describe("registro de plantillas", () => {
  it("tiene las seis del día 0 y las dos de comunidad", () => {
    expect(COLLECTION_TEMPLATES.map((t) => t.key)).toEqual([
      "new-releases",
      "grammy-winners",
      "genre-spotlight",
      "anniversaries",
      "upcoming",
      "one-per-decade",
      "top-rated-quarter",
      "popular-month",
    ]);
  });

  it("las claves son únicas y los rank distintos", () => {
    const keys = COLLECTION_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(COLLECTION_TEMPLATES.map((t) => t.rank)).size).toBe(keys.length);
  });

  it("las de comunidad nacen con más peso que las del día 0", () => {
    for (const template of COLLECTION_TEMPLATES) {
      const community = template.key === "top-rated-quarter" || template.key === "popular-month";
      expect(template.weight).toBe(community ? COMMUNITY_WEIGHT : 0);
    }
  });

  it("findTemplate devuelve undefined para una clave desconocida", () => {
    expect(findTemplate("no-existe")).toBeUndefined();
  });
});

describe("períodos y títulos", () => {
  it("top-rated-quarter cambia de período por trimestre y lo dice en el título", () => {
    expect(quarterPeriodKey(at("2026-01-01T00:00:00Z"))).toBe("2026-Q1");
    expect(quarterPeriodKey(at("2026-03-31T23:59:59Z"))).toBe("2026-Q1");
    expect(quarterPeriodKey(at("2026-10-11T00:00:00Z"))).toBe("2026-Q4");
    expect(quarterTitle(at("2026-10-11T00:00:00Z"))).toBe("Mejor valorados del 4.º trimestre de 2026");
  });

  it("popular-month cambia de período por mes y lo dice en el título", () => {
    expect(monthPeriodKey(at("2026-10-11T00:00:00Z"))).toBe("2026-10");
    expect(monthPeriodKey(at("2026-11-01T00:00:00Z"))).toBe("2026-11");
    expect(popularMonthTitle(at("2026-10-11T00:00:00Z"))).toBe("Lo más popular de octubre de 2026");
  });

  it("most-reviewed-month ya no está en el registro (se retiró)", () => {
    expect(findTemplate("most-reviewed-month")).toBeUndefined();
  });

  it("calcula el inicio del trimestre y del mes en UTC", () => {
    expect(quarterStartIso(at("2026-11-20T10:00:00Z"))).toBe("2026-10-01T00:00:00.000Z");
    expect(monthStartIso(at("2026-11-20T10:00:00Z"))).toBe("2026-11-01T00:00:00.000Z");
  });

  it("evergreen es la clave de las listas únicas", () => {
    expect(EVERGREEN).toBe("evergreen");
  });
});
