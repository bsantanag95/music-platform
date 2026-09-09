import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  replaceAlbumFavorites: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/profiles/album-favorites", () => ({
  replaceAlbumFavorites: mocks.replaceAlbumFavorites,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const fid = (n: number) => `00000000-0000-4000-8000-0000000000f${n}`;

function put(body: unknown) {
  return new NextRequest("http://localhost/api/me/profile/album-favorites", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
  mocks.replaceAlbumFavorites.mockResolvedValue([]);
});

describe("PUT /api/me/profile/album-favorites", () => {
  it("reemplaza el conjunto ordenado y devuelve albumFavorites", async () => {
    mocks.replaceAlbumFavorites.mockResolvedValue([
      { id: "p1", favoriteId: fid(2), position: 1, target: { id: "rg2", title: "B", artistName: null, coverThumbUrl: null } },
    ]);
    const res = await PUT(put({ favoriteIds: [fid(2), fid(1)] }));
    expect(res.status).toBe(200);
    expect(mocks.replaceAlbumFavorites).toHaveBeenCalledWith(user.id, [fid(2), fid(1)]);
    expect((await res.json()).albumFavorites).toHaveLength(1);
  });

  it("rechaza más de 6 con VALIDATION_ERROR antes de tocar el servicio", async () => {
    const res = await PUT(put({ favoriteIds: Array.from({ length: 7 }, (_, i) => fid(i)) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.replaceAlbumFavorites).not.toHaveBeenCalled();
  });

  it("rechaza un id no-UUID", async () => {
    const res = await PUT(put({ favoriteIds: ["no-uuid"] }));
    expect(res.status).toBe(400);
    expect(mocks.replaceAlbumFavorites).not.toHaveBeenCalled();
  });

  it("propaga VALIDATION_ERROR del servicio (favorito ajeno / no álbum)", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    mocks.replaceAlbumFavorites.mockRejectedValue(
      new ApiError("VALIDATION_ERROR", 400, "Solo se pueden fijar favoritos de álbum propios"),
    );
    const res = await PUT(put({ favoriteIds: [fid(1)] }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("DELETE /api/me/profile/album-favorites", () => {
  it("vacía la sección", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mocks.replaceAlbumFavorites).toHaveBeenCalledWith(user.id, []);
  });
});
