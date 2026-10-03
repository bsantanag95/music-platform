import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getAlbumGenreVotes: vi.fn() }));
vi.mock("@/services/auth/authorization", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/services/genres/votes", () => ({
  getAlbumGenreVotes: mocks.getAlbumGenreVotes,
}));

const { GET } = await import("./route");

const ID = "00000000-0000-4000-8000-0000000000aa";
const call = (id: string) =>
  GET(new NextRequest(`http://localhost/api/catalog/release-group/${id}/genre-votes`), { params: Promise.resolve({ id }) });

const votes = {
  genres: [{ slug: "shoegaze", name: "shoegaze", nameEs: null, inherited: false, score: 4, rank: "primary", up: null, down: null, mine: null }],
  showCounts: false,
  access: { canVote: false, reason: "signed_out" },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCurrentUser.mockResolvedValue(null);
  mocks.getAlbumGenreVotes.mockResolvedValue(votes);
});

describe("GET /api/catalog/release-group/{id}/genre-votes", () => {
  it("responde a un visitante sin votos propios y sin caché", async () => {
    const res = await call(ID);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ genres: votes.genres, showCounts: false, canVote: false, reason: "signed_out" });
    expect(mocks.getAlbumGenreVotes).toHaveBeenCalledWith(ID, null);
  });

  it("con sesión pide los votos para esa persona", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1" });
    mocks.getAlbumGenreVotes.mockResolvedValue({ ...votes, access: { canVote: true } });
    const body = await (await call(ID)).json();
    expect(mocks.getAlbumGenreVotes).toHaveBeenCalledWith(ID, "u1");
    expect(body).toMatchObject({ canVote: true, reason: null });
  });

  it("con un id inválido responde 400 sin consultar", async () => {
    const res = await call("no-es-uuid");
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.getAlbumGenreVotes).not.toHaveBeenCalled();
  });
});
