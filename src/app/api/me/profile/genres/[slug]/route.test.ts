import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  addIdentityGenre: vi.fn(),
  removeIdentityGenre: vi.fn(),
}));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/profiles/music-identity", () => ({
  addIdentityGenre: mocks.addIdentityGenre,
  removeIdentityGenre: mocks.removeIdentityGenre,
}));

const { PUT, DELETE } = await import("./route");

const ctx = { params: Promise.resolve({ slug: "shoegaze" }) };
const request = (method: string) => new NextRequest("http://localhost/api/me/profile/genres/shoegaze", { method });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
});

describe("PUT /api/me/profile/genres/{slug}", () => {
  it("agrega el género y devuelve la lista sin caché", async () => {
    mocks.addIdentityGenre.mockResolvedValue(["jazz", "shoegaze"]);
    const res = await PUT(request("PUT"), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(mocks.addIdentityGenre).toHaveBeenCalledWith("u1", "shoegaze");
    expect(await res.json()).toEqual({ genres: ["jazz", "shoegaze"] });
  });

  it("sin sesión responde 401 y no escribe", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Autenticación requerida"));
    const res = await PUT(request("PUT"), ctx);
    expect(res.status).toBe(401);
    expect(mocks.addIdentityGenre).not.toHaveBeenCalled();
  });

  it("propaga 409 con la lista llena y 404 con un género inexistente", async () => {
    mocks.addIdentityGenre.mockRejectedValueOnce(new ApiError("MUSIC_IDENTITY_GENRES_FULL", 409, "lleno"));
    const full = await PUT(request("PUT"), ctx);
    expect(full.status).toBe(409);
    expect((await full.json()).code).toBe("MUSIC_IDENTITY_GENRES_FULL");

    mocks.addIdentityGenre.mockRejectedValueOnce(new ApiError("GENRE_NOT_FOUND", 404, "no existe"));
    const missing = await PUT(request("PUT"), ctx);
    expect(missing.status).toBe(404);
    expect((await missing.json()).code).toBe("GENRE_NOT_FOUND");
  });
});

describe("DELETE /api/me/profile/genres/{slug}", () => {
  it("quita el género y devuelve la lista", async () => {
    mocks.removeIdentityGenre.mockResolvedValue(["jazz"]);
    const res = await DELETE(request("DELETE"), ctx);
    expect(res.status).toBe(200);
    expect(mocks.removeIdentityGenre).toHaveBeenCalledWith("u1", "shoegaze");
    expect(await res.json()).toEqual({ genres: ["jazz"] });
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Autenticación requerida"));
    expect((await DELETE(request("DELETE"), ctx)).status).toBe(401);
    expect(mocks.removeIdentityGenre).not.toHaveBeenCalled();
  });
});
