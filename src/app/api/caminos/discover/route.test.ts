import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ discoverCaminos: vi.fn() }));
vi.mock("@/services/camino/discovery", () => ({ discoverCaminos: mocks.discoverCaminos }));

describe("GET /api/caminos/discover", () => {
  it("pasa los filtros de familia, género y artista al servicio", async () => {
    mocks.discoverCaminos.mockResolvedValue({ caminos: [], page: 1, pageSize: 20, hasNext: false });
    const response = await GET(
      new NextRequest("http://localhost/x?family=rock&genre=shoegaze&artist=slowdive&page=1&pageSize=10"),
    );
    expect(response.status).toBe(200);
    expect(mocks.discoverCaminos).toHaveBeenCalledWith(
      { family: "rock", genre: "shoegaze", artistQuery: "slowdive" },
      1,
      10,
    );
  });

  it("sin filtros, los pasa como undefined", async () => {
    mocks.discoverCaminos.mockResolvedValue({ caminos: [], page: 1, pageSize: 20, hasNext: false });
    await GET(new NextRequest("http://localhost/x"));
    expect(mocks.discoverCaminos).toHaveBeenCalledWith({ family: undefined, genre: undefined, artistQuery: undefined }, 1, 20);
  });

  it("no requiere sesión", async () => {
    mocks.discoverCaminos.mockResolvedValue({ caminos: [], page: 1, pageSize: 20, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/x"));
    expect(response.status).toBe(200);
  });
});
