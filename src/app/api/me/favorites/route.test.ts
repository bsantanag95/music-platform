import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PATCH } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listMyFavorites: vi.fn(),
  updateFavoriteAudience: vi.fn(),
  updateFavoritesAudienceBulk: vi.fn(),
  resolveFavoriteTarget: vi.fn(),
  toggleFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/favorites/favorites", () => ({
  listMyFavorites: mocks.listMyFavorites,
  updateFavoriteAudience: mocks.updateFavoriteAudience,
  updateFavoritesAudienceBulk: mocks.updateFavoritesAudienceBulk,
  resolveFavoriteTarget: mocks.resolveFavoriteTarget,
  toggleFavorite: mocks.toggleFavorite,
  removeFavorite: mocks.removeFavorite,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const favId = "00000000-0000-4000-8000-0000000000aa";
const favId2 = "00000000-0000-4000-8000-0000000000bb";

const listResult = {
  favorites: [],
  page: 1,
  pageSize: 20,
  hasNext: false,
  counts: { artist: 0, "release-group": 0, recording: 0 },
};

describe("GET /api/me/favorites", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sin filtros pasa filtros vacíos al servicio (retrocompatible)", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyFavorites.mockResolvedValue(listResult);
    const response = await GET(new NextRequest("http://localhost/api/me/favorites"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(listResult);
    expect(mocks.listMyFavorites).toHaveBeenCalledWith(user.id, 1, 20, {});
  });

  it("parsea q/type/audience/sort", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyFavorites.mockResolvedValue(listResult);
    await GET(
      new NextRequest(
        "http://localhost/api/me/favorites?q=wall&type=release-group&audience=public&sort=alpha",
      ),
    );
    expect(mocks.listMyFavorites).toHaveBeenCalledWith(user.id, 1, 20, {
      q: "wall",
      type: "release-group",
      audience: "public",
      sort: "alpha",
    });
  });

  it("rechaza un filtro inválido con VALIDATION_ERROR", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/me/favorites?sort=chronological"),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listMyFavorites).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/me/favorites", () => {
  beforeEach(() => vi.clearAllMocks());

  function patch(body: unknown) {
    return PATCH(
      new NextRequest("http://localhost/api/me/favorites", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("cambia la audiencia de un favorito (forma { id })", async () => {
    mocks.requireUser.mockResolvedValue(user);
    const favorite = { id: favId, audience: "public" };
    mocks.updateFavoriteAudience.mockResolvedValue(favorite);
    const response = await patch({ id: favId, audience: "public" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ favorite });
    expect(mocks.updateFavoriteAudience).toHaveBeenCalledWith(favId, user.id, "public");
    expect(mocks.updateFavoritesAudienceBulk).not.toHaveBeenCalled();
  });

  it("cambia la audiencia en lote (forma { ids })", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateFavoritesAudienceBulk.mockResolvedValue([favId, favId2]);
    const response = await patch({ ids: [favId, favId2], audience: "private" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ updatedIds: [favId, favId2] });
    expect(mocks.updateFavoritesAudienceBulk).toHaveBeenCalledWith(
      [favId, favId2],
      user.id,
      "private",
    );
    expect(mocks.updateFavoriteAudience).not.toHaveBeenCalled();
  });

  it("rechaza un lote vacío con VALIDATION_ERROR", async () => {
    const response = await patch({ ids: [], audience: "private" });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("propaga FAVORITE_NOT_FOUND del servicio", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateFavoritesAudienceBulk.mockRejectedValue(
      new ApiError("FAVORITE_NOT_FOUND", 404, "Ninguno es tuyo"),
    );
    const response = await patch({ ids: [favId], audience: "public" });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "FAVORITE_NOT_FOUND" });
  });

  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const response = await patch({ id: favId, audience: "public" });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });
});
