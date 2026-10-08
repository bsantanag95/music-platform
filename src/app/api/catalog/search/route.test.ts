import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import type { ArtistSearchResponse } from "@/services/catalog/search/types";

vi.mock("@/services/catalog/search", () => ({ searchCatalogByType: vi.fn() }));

const { searchCatalogByType } = await import("@/services/catalog/search");
const { GET } = await import("./route");

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/catalog/search${query}`);
}

const poisons: ArtistSearchResponse = {
  type: "artist",
  remoteFailed: false,
  results: [
    {
      kind: "artist",
      id: "11111111-1111-4111-8111-111111111111",
      mbid: "aaaaaaaa-0000-4000-8000-000000000001",
      name: "Poison",
      disambiguation: "glam metal band",
      artistType: "group",
      country: "US",
      cached: false,
      exact: true,
    },
    {
      kind: "artist",
      id: "22222222-2222-4222-8222-222222222222",
      mbid: "aaaaaaaa-0000-4000-8000-000000000002",
      name: "Poison",
      disambiguation: "thrash metal band",
      artistType: "group",
      country: null,
      cached: false,
      exact: true,
    },
  ],
};

describe("GET /api/catalog/search", () => {
  beforeEach(() => vi.clearAllMocks());

  it("busca solo el tipo pedido y preserva homónimos", async () => {
    vi.mocked(searchCatalogByType).mockResolvedValue(poisons);

    const res = await GET(request("?type=artist&q=Poison"));

    expect(res.status).toBe(200);
    expect(searchCatalogByType).toHaveBeenCalledWith(
      {
        type: "artist",
        q: "Poison",
        offset: 0,
        artistType: undefined,
        category: undefined,
        decade: undefined,
        purpose: undefined,
      },
      expect.any(AbortSignal),
    );
    await expect(res.json()).resolves.toEqual(poisons);
  });

  it("pasa offset y filtros válidos, e ignora los inválidos", async () => {
    vi.mocked(searchCatalogByType).mockResolvedValue({
      type: "album",
      results: [],
      remoteFailed: false,
      total: 0,
      nextOffset: null,
      refine: null,
    });

    await GET(request("?type=album&q=%20destroyer%20&offset=25&category=studio&decade=1970&artistType=robot"));
    await GET(request("?type=album&q=destroyer&category=jazz&decade=1975"));

    expect(vi.mocked(searchCatalogByType).mock.calls.map(([params]) => params)).toEqual([
      { type: "album", q: "destroyer", offset: 25, artistType: undefined, category: "studio", decade: 1970, purpose: undefined },
      { type: "album", q: "destroyer", offset: 0, artistType: undefined, category: undefined, decade: undefined, purpose: undefined },
    ]);
  });

  it("pasa purpose=pick y la señal de la solicitud; otro purpose se ignora", async () => {
    vi.mocked(searchCatalogByType).mockResolvedValue({
      type: "song",
      results: [],
      remoteFailed: false,
      total: 0,
      nextOffset: null,
      interpretation: null,
      alternatives: [],
      refine: null,
    });
    const req = request("?type=song&q=holy%20wars&purpose=pick");

    await GET(req);
    await GET(request("?type=song&q=holy%20wars&purpose=browse"));

    const calls = vi.mocked(searchCatalogByType).mock.calls;
    expect(calls[0]![0]).toMatchObject({ type: "song", q: "holy wars", purpose: "pick" });
    expect(calls[0]![1]).toBe(req.signal);
    expect(calls[1]![0].purpose).toBeUndefined();
  });

  it("una búsqueda abandonada no se registra como error", async () => {
    const controller = new AbortController();
    const req = new NextRequest("http://localhost/api/catalog/search?type=album&q=slayer", { signal: controller.signal });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(searchCatalogByType).mockImplementation(async () => {
      controller.abort();
      throw new DOMException("abandonada", "AbortError");
    });

    const res = await GET(req);

    expect(res.status).toBe(499);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("sin coincidencias es 200 con lista vacía, no 404", async () => {
    vi.mocked(searchCatalogByType).mockResolvedValue({ type: "artist", results: [], remoteFailed: false });

    const res = await GET(request("?type=artist&q=zzzz"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ type: "artist", results: [], remoteFailed: false });
  });

  it("falta q o type, o type no es de catálogo → 400 VALIDATION_ERROR", async () => {
    for (const query of ["", "?type=artist", "?type=artist&q=%20%20", "?q=Poison", "?type=user&q=ana", "?type=all&q=x"]) {
      const res = await GET(request(query));
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" });
    }
    expect(searchCatalogByType).not.toHaveBeenCalled();
  });

  it("el fallo total de MusicBrainz se mapea a INTERNAL_ERROR (502)", async () => {
    vi.mocked(searchCatalogByType).mockRejectedValue(
      new ApiError("INTERNAL_ERROR", 502, "MusicBrainz no respondió"),
    );

    const res = await GET(request("?type=song&q=taste"));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({ code: "INTERNAL_ERROR" });
  });

  it("la degradación parcial es un 200 con remoteFailed", async () => {
    vi.mocked(searchCatalogByType).mockResolvedValue({ ...poisons, remoteFailed: true });

    const res = await GET(request("?type=artist&q=Poison"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ remoteFailed: true });
  });
});
