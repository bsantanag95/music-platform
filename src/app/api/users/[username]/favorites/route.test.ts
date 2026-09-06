import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  listUserFavorites: vi.fn(),
}));

vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/favorites/favorites", () => ({
  listUserFavorites: mocks.listUserFavorites,
}));

const result = {
  favorites: [],
  page: 1,
  pageSize: 20,
  hasNext: false,
  counts: { artist: 2, "release-group": 5, recording: 1 },
};

describe("GET /api/users/[username]/favorites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el listado con counts, con sesión opcional", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listUserFavorites.mockResolvedValue(result);
    const response = await GET(new NextRequest("http://localhost/api/users/ana/favorites"), {
      params: Promise.resolve({ username: "ana" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(mocks.listUserFavorites).toHaveBeenCalledWith("ana", null, 1, 20);
  });

  it("rechaza una paginación inválida con VALIDATION_ERROR", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/users/ana/favorites?page=0"),
      { params: Promise.resolve({ username: "ana" }) },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
