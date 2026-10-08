import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTargetMarks } from "./marks";

const id = "a1b2c3d4-0000-4000-8000-000000000002";

describe("cliente API de marcas", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("pide las marcas con type e id y valida la respuesta", async () => {
    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ favorite: true, pending: null, stars: 3.5, detailedScore: null }), { status: 200 }),
      );
    await expect(getTargetMarks("recording", id)).resolves.toEqual({
      favorite: true,
      pending: null,
      stars: 3.5,
      detailedScore: null,
    });
    const url = new URL(fetchMock.mock.calls[0]![0] as string, "http://localhost");
    expect(url.pathname).toBe("/api/me/marks");
    expect(url.searchParams.get("type")).toBe("recording");
    expect(url.searchParams.get("id")).toBe(id);
  });

  it("rechaza una respuesta con forma inesperada", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ favorite: "sí" }), { status: 200 }));
    await expect(getTargetMarks("artist", id)).rejects.toBeDefined();
  });
});
