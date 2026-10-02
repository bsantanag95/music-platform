import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ searchGenres: vi.fn() }));
vi.mock("@/services/genres/search", () => ({ searchGenres: mocks.searchGenres }));

describe("GET /api/genres/search", () => {
  it("devuelve los géneros sin requerir sesión", async () => {
    mocks.searchGenres.mockResolvedValue([{ slug: "shoegaze", name: "shoegaze", nameEs: null }]);
    const response = await GET(new NextRequest("http://localhost/api/genres/search?q=shoe"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ genres: [{ slug: "shoegaze", name: "shoegaze", nameEs: null }] });
    expect(mocks.searchGenres).toHaveBeenCalledWith("shoe");
  });

  it("sin q pasa null (sugerencias iniciales)", async () => {
    mocks.searchGenres.mockResolvedValue([]);
    await GET(new NextRequest("http://localhost/api/genres/search"));
    expect(mocks.searchGenres).toHaveBeenLastCalledWith(null);
  });

  it("un texto inválido responde 400 VALIDATION_ERROR", async () => {
    mocks.searchGenres.mockRejectedValue(new ApiError("VALIDATION_ERROR", 400, "largo"));
    const response = await GET(new NextRequest("http://localhost/api/genres/search?q=x"));
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
  });
});
