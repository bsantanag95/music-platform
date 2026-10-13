import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import { COLLECTION_TEMPLATES } from "./templates";
import {
  COLLECTION_FAMILIES,
  FALLBACK_FAMILY,
  TEMPLATE_FAMILY,
  familyOf,
  isCollectionFamily,
  templateKeysOf,
} from "./families";

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

  it("asigna la familia que corresponde a cada tipo de colección", () => {
    expect(familyOf("anniversaries")).toBe("ephemeris");
    expect(familyOf("grammy-winners")).toBe("awards");
    expect(familyOf("upcoming")).toBe("releases");
    expect(familyOf("genre-spotlight")).toBe("discovery");
    expect(familyOf("top-rated-quarter")).toBe("community");
  });

  it("una clave retirada del registro (o nula) cae a la familia de respaldo", () => {
    expect(familyOf("plantilla-que-ya-no-existe")).toBe(FALLBACK_FAMILY);
    expect(familyOf(null)).toBe(FALLBACK_FAMILY);
  });

  it("templateKeysOf devuelve las claves de la familia", () => {
    expect(templateKeysOf("releases").sort()).toEqual(["new-releases", "upcoming"]);
    expect(templateKeysOf("awards")).toEqual(["grammy-winners"]);
  });

  it("isCollectionFamily valida el vocabulario", () => {
    for (const family of COLLECTION_FAMILIES) expect(isCollectionFamily(family)).toBe(true);
    expect(isCollectionFamily("editorial")).toBe(false);
    expect(isCollectionFamily(undefined)).toBe(false);
  });
});
