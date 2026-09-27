import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/services/catalog/search/suggest", () => ({ suggest: vi.fn() }));

const { suggest } = await import("@/services/catalog/search/suggest");
const { GET } = await import("./route");

function request(query: string): NextRequest {
  return new NextRequest(`http://localhost/api/search/suggest${query}`);
}

describe("GET /api/search/suggest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve las sugerencias del tipo con caché privada corta", async () => {
    vi.mocked(suggest).mockResolvedValue([
      { kind: "artist", id: "a", name: "Sabrina Carpenter", artistType: "person", disambiguation: null },
    ]);

    const res = await GET(request("?type=artist&q=sabr"));

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=30");
    expect(suggest).toHaveBeenCalledWith("artist", "sabr");
    await expect(res.json()).resolves.toEqual({
      suggestions: [
        { kind: "artist", id: "a", name: "Sabrina Carpenter", artistType: "person", disambiguation: null },
      ],
    });
  });

  it("acepta usuarios además de los tipos de catálogo", async () => {
    vi.mocked(suggest).mockResolvedValue([]);
    const res = await GET(request("?type=user&q=an"));
    expect(res.status).toBe(200);
  });

  it("type ausente o inválido → 400 VALIDATION_ERROR", async () => {
    for (const query of ["?q=kiss", "?type=genre&q=kiss"]) {
      const res = await GET(request(query));
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" });
    }
    expect(suggest).not.toHaveBeenCalled();
  });
});
