import { describe, expect, it, vi } from "vitest";
import catalogEs from "../../../../../messages/es/catalog.json";
import catalogEn from "../../../../../messages/en/catalog.json";

// Los presentadores consultan la base al presentar; aquí solo se mira el registro y los textos.
vi.mock("@/db", () => ({ db: {} }));
vi.mock("../../discovery", () => ({ albumReleaseDates: vi.fn() }));
vi.mock("./ranking-stats", () => ({ ratingStats: vi.fn(), reviewCounts: vi.fn() }));
vi.mock("@/services/awards/collection-context", () => ({ ceremonyContext: vi.fn() }));

const { PRESENTER_REGISTRY, TEMPLATE_PRESENTERS } = await import("./index");
const { COLLECTION_TEMPLATES } = await import("../templates");
const { COLLECTION_FAMILIES } = await import("../families");
const { CONTEXT_MESSAGE_KEYS } = await import("./keys");

describe("registro de presentadores", () => {
  it("toda clave de presentador existe en el registro de plantillas", () => {
    const templates = new Set(COLLECTION_TEMPLATES.map((template) => template.key));
    for (const key of Object.keys(TEMPLATE_PRESENTERS)) expect(templates.has(key), key).toBe(true);
  });

  it("toda plantilla del registro de plantillas tiene presentador propio", () => {
    for (const template of COLLECTION_TEMPLATES) expect(TEMPLATE_PRESENTERS[template.key], template.key).toBeTypeOf("function");
  });

  it("toda familia tiene presentador, y solo ellas", () => {
    expect(Object.keys(PRESENTER_REGISTRY.byFamily).sort()).toEqual([...COLLECTION_FAMILIES].sort());
  });
});

describe("textos de los presentadores", () => {
  const context = (catalog: typeof catalogEs) =>
    (catalog.explore as unknown as Record<string, Record<string, string>>).collectionContext!;

  it("toda clave que emiten los presentadores existe en el catálogo de los dos idiomas", () => {
    for (const key of CONTEXT_MESSAGE_KEYS) {
      expect(context(catalogEs)[key], `es.${key}`).toBeTruthy();
      expect(context(catalogEn)[key], `en.${key}`).toBeTruthy();
    }
  });

  it("el catálogo no trae claves que ningún presentador emita", () => {
    const emitted = new Set<string>(CONTEXT_MESSAGE_KEYS);
    for (const key of Object.keys(context(catalogEs))) expect(emitted.has(key), key).toBe(true);
  });
});
