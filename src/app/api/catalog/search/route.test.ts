import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import * as searchService from "@/services/catalog/search-catalog";
import { ApiError } from "@/lib/api/errors";
import type { CatalogSearchResult } from "@/services/catalog/search-catalog";

vi.mock("@/services/catalog/search-catalog", () => ({
  searchCatalog: vi.fn(),
}));

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

const poisonGlam: CatalogSearchResult = {
  kind: "artist",
  id: "11111111-1111-4111-8111-111111111111",
  mbid: "aaaaaaaa-0000-4000-8000-000000000001",
  name: "Poison",
  subtitle: "glam metal band",
  artistType: "group",
  category: null,
  year: null,
  cached: false,
};

const poisonThrash: CatalogSearchResult = {
  ...poisonGlam,
  id: "22222222-2222-4222-8222-222222222222",
  mbid: "aaaaaaaa-0000-4000-8000-000000000002",
  subtitle: "thrash metal band",
};

describe("GET /api/catalog/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve la lista de candidatos con homónimos preservados", async () => {
    vi.mocked(searchService.searchCatalog).mockResolvedValue([poisonGlam, poisonThrash]);

    const res = await GET(makeRequest("http://localhost/api/catalog/search?q=Poison"));

    expect(res.status).toBe(200);
    expect(searchService.searchCatalog).toHaveBeenCalledWith("Poison");
    await expect(res.json()).resolves.toEqual({ results: [poisonGlam, poisonThrash] });
  });

  it("sin coincidencias es 200 con lista vacía, no 404", async () => {
    vi.mocked(searchService.searchCatalog).mockResolvedValue([]);

    const res = await GET(makeRequest("http://localhost/api/catalog/search?q=zzzz"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ results: [] });
  });

  it("falta q o llega vacío tras normalizar -> 400 VALIDATION_ERROR", async () => {
    for (const url of [
      "http://localhost/api/catalog/search",
      "http://localhost/api/catalog/search?q=",
      "http://localhost/api/catalog/search?q=%20%20",
    ]) {
      const res = await GET(makeRequest(url));
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" });
    }
    expect(searchService.searchCatalog).not.toHaveBeenCalled();
  });

  it("normaliza el texto antes de buscar", async () => {
    vi.mocked(searchService.searchCatalog).mockResolvedValue([]);

    await GET(makeRequest("http://localhost/api/catalog/search?q=%20Pink%20Floyd%20"));

    expect(searchService.searchCatalog).toHaveBeenCalledWith("Pink Floyd");
  });

  it("el fallo total de MusicBrainz se mapea a INTERNAL_ERROR (502)", async () => {
    vi.mocked(searchService.searchCatalog).mockRejectedValue(
      new ApiError("INTERNAL_ERROR", 502, "MusicBrainz no respondió"),
    );

    const res = await GET(makeRequest("http://localhost/api/catalog/search?q=Poison"));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("la degradación parcial (hubo resultados locales) es un 200 normal", async () => {
    vi.mocked(searchService.searchCatalog).mockResolvedValue([poisonGlam]);

    const res = await GET(makeRequest("http://localhost/api/catalog/search?q=Poison"));

    expect(res.status).toBe(200);
  });
});
