import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  castGenreVote: vi.fn(),
  removeGenreVote: vi.fn(),
  getAlbumGenreVotes: vi.fn(),
}));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/genres/votes", () => ({
  castGenreVote: mocks.castGenreVote,
  removeGenreVote: mocks.removeGenreVote,
  getAlbumGenreVotes: mocks.getAlbumGenreVotes,
}));

const { PUT, DELETE } = await import("./route");

const ID = "00000000-0000-4000-8000-0000000000aa";
const ctx = { params: Promise.resolve({ id: ID, slug: "shoegaze" }) };
const put = (body: unknown) =>
  PUT(
    new NextRequest(`http://localhost/api/me/release-groups/${ID}/genre-votes/shoegaze`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    ctx,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
  mocks.getAlbumGenreVotes.mockResolvedValue({ genres: [], showCounts: false, access: { canVote: true } });
});

describe("PUT /api/me/release-groups/{id}/genre-votes/{slug}", () => {
  it("guarda el voto y devuelve el estado actualizado sin caché", async () => {
    const res = await put({ value: 1 });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(mocks.castGenreVote).toHaveBeenCalledWith("u1", ID, "shoegaze", 1);
    expect(await res.json()).toEqual({ genres: [], showCounts: false, canVote: true, reason: null });
  });

  it.each([{ value: 2 }, { value: 0 }, { value: "1" }, {}, null])("rechaza el cuerpo %j con 400", async (body) => {
    const res = await put(body);
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.castGenreVote).not.toHaveBeenCalled();
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Se requiere una sesión activa"));
    expect((await put({ value: 1 })).status).toBe(401);
  });

  it("propaga el error de falta de interacción como 403", async () => {
    mocks.castGenreVote.mockRejectedValue(new ApiError("GENRE_VOTE_NO_INTERACTION", 403, "sin interacción"));
    const res = await put({ value: 1 });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("GENRE_VOTE_NO_INTERACTION");
  });

  it("propaga el género inexistente como 404", async () => {
    mocks.castGenreVote.mockRejectedValue(new ApiError("GENRE_NOT_FOUND", 404, "no existe"));
    expect((await put({ value: -1 })).status).toBe(404);
  });
});

describe("DELETE /api/me/release-groups/{id}/genre-votes/{slug}", () => {
  it("retira el voto y devuelve el estado actualizado", async () => {
    const res = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), ctx);
    expect(res.status).toBe(200);
    expect(mocks.removeGenreVote).toHaveBeenCalledWith("u1", ID, "shoegaze");
  });

  it("sin sesión responde 401 y no borra", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Se requiere una sesión activa"));
    const res = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), ctx);
    expect(res.status).toBe(401);
    expect(mocks.removeGenreVote).not.toHaveBeenCalled();
  });
});
