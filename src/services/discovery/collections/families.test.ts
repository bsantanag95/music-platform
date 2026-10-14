import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import { COLLECTION_TEMPLATES } from "./templates";
import { COLLECTION_FAMILIES, TEMPLATE_FAMILY, isCollectionFamily } from "./families";

describe("familias de colección", () => {
  it("toda plantilla del registro tiene familia", () => {
    for (const template of COLLECTION_TEMPLATES) {
      expect(TEMPLATE_FAMILY[template.key], template.key).toBeDefined();
    }
  });

  it("no hay familias declaradas para plantillas que no existen", () => {
    const keys = new Set(COLLECTION_TEMPLATES.map((template) => template.key));
    for (const key of Object.keys(TEMPLATE_FAMILY)) expect(keys.has(key), key).toBe(true);
  });

  it("declara la familia que corresponde a cada tipo de colección", () => {
    expect(TEMPLATE_FAMILY["anniversaries"]).toBe("ephemeris");
    expect(TEMPLATE_FAMILY["grammy-winners"]).toBe("awards");
    expect(TEMPLATE_FAMILY["upcoming"]).toBe("releases");
    expect(TEMPLATE_FAMILY["genre-spotlight"]).toBe("discovery");
    expect(TEMPLATE_FAMILY["top-rated-quarter"]).toBe("rankings");
  });

  it("toda familia declarada está en el vocabulario", () => {
    for (const [key, family] of Object.entries(TEMPLATE_FAMILY)) {
      expect(isCollectionFamily(family), key).toBe(true);
    }
  });

  it("isCollectionFamily valida el vocabulario", () => {
    for (const family of COLLECTION_FAMILIES) expect(isCollectionFamily(family)).toBe(true);
    expect(isCollectionFamily("editorial")).toBe(false);
    // `community` se renombró a `rankings` en la migración 0071.
    expect(isCollectionFamily("community")).toBe(false);
    expect(isCollectionFamily(undefined)).toBe(false);
  });
});
