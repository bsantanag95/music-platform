import { describe, expect, it } from "vitest";
import { DEFAULT_COLLECTION_VIEW_MODE, parseCollectionViewMode } from "./collection-view-mode";

describe("parseCollectionViewMode", () => {
  it("acepta los modos válidos", () => {
    expect(parseCollectionViewMode("shelf")).toBe("shelf");
    expect(parseCollectionViewMode("detailed")).toBe("detailed");
    expect(parseCollectionViewMode("index")).toBe("index");
  });

  it("cae al default ante un valor inválido, nulo o vacío", () => {
    expect(parseCollectionViewMode("grid")).toBe(DEFAULT_COLLECTION_VIEW_MODE);
    expect(parseCollectionViewMode(null)).toBe(DEFAULT_COLLECTION_VIEW_MODE);
    expect(parseCollectionViewMode(undefined)).toBe(DEFAULT_COLLECTION_VIEW_MODE);
    expect(DEFAULT_COLLECTION_VIEW_MODE).toBe("shelf");
  });
});
