import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import { COLLECTION_TEMPLATES, EVERGREEN, findTemplate, monthStartIso, quarterStartIso } from "./templates";

const at = (iso: string) => new Date(iso);

describe("plantillas de colecciones", () => {
  it("las claves son únicas y los rank distintos", () => {
    const keys = COLLECTION_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(COLLECTION_TEMPLATES.map((t) => t.rank)).size).toBe(keys.length);
  });

  it("las plantillas evergreen usan una única clave de período y un título fijo", () => {
    for (const key of ["new-releases", "one-per-decade"]) {
      const template = findTemplate(key)!;
      expect(template.periodKey(at("2026-02-01T00:00:00Z"))).toBe(EVERGREEN);
      expect(template.periodKey(at("2026-11-20T00:00:00Z"))).toBe(EVERGREEN);
      expect(template.title(at("2026-02-01T00:00:00Z"))).toBe(template.title(at("2026-11-20T00:00:00Z")));
    }
  });

  it("top-rated-quarter cambia de período por trimestre y lo dice en el título", () => {
    const template = findTemplate("top-rated-quarter")!;
    expect(template.periodKey(at("2026-01-01T00:00:00Z"))).toBe("2026-Q1");
    expect(template.periodKey(at("2026-03-31T23:59:59Z"))).toBe("2026-Q1");
    expect(template.periodKey(at("2026-10-11T00:00:00Z"))).toBe("2026-Q4");
    expect(template.title(at("2026-10-11T00:00:00Z"))).toBe("Mejor valorados del 4.º trimestre de 2026");
  });

  it("most-reviewed-month cambia de período por mes y lo dice en el título", () => {
    const template = findTemplate("most-reviewed-month")!;
    expect(template.periodKey(at("2026-10-11T00:00:00Z"))).toBe("2026-10");
    expect(template.periodKey(at("2026-11-01T00:00:00Z"))).toBe("2026-11");
    expect(template.title(at("2026-10-11T00:00:00Z"))).toBe("Lo más reseñado de octubre de 2026");
  });

  it("calcula el inicio del trimestre y del mes en UTC", () => {
    expect(quarterStartIso(at("2026-11-20T10:00:00Z"))).toBe("2026-10-01T00:00:00.000Z");
    expect(monthStartIso(at("2026-11-20T10:00:00Z"))).toBe("2026-11-01T00:00:00.000Z");
  });

  it("findTemplate devuelve undefined para una clave desconocida", () => {
    expect(findTemplate("no-existe")).toBeUndefined();
  });
});
