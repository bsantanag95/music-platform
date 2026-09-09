import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  followArtist: vi.fn(),
  unfollowArtist: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/social/artist-following", () => ({
  followArtist: mocks.followArtist,
  unfollowArtist: mocks.unfollowArtist,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const AID = "00000000-0000-4000-8000-0000000000a1";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = () => new NextRequest("http://localhost/api/artists/x/follow", { method: "PUT" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
  mocks.followArtist.mockResolvedValue({ following: true });
  mocks.unfollowArtist.mockResolvedValue({ following: false });
});

describe("PUT /api/artists/[id]/follow", () => {
  it("sigue al artista", async () => {
    const res = await PUT(req(), ctx(AID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ following: true });
    expect(mocks.followArtist).toHaveBeenCalledWith(user.id, AID);
  });

  it("es idempotente (segunda llamada igual)", async () => {
    await PUT(req(), ctx(AID));
    await PUT(req(), ctx(AID));
    expect(mocks.followArtist).toHaveBeenCalledTimes(2);
  });

  it("rechaza un id no-UUID con 404", async () => {
    const res = await PUT(req(), ctx("nope"));
    expect(res.status).toBe(404);
    expect(mocks.followArtist).not.toHaveBeenCalled();
  });

  it("propaga AUTH_REQUIRED sin sesión", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const res = await PUT(req(), ctx(AID));
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/artists/[id]/follow", () => {
  it("deja de seguir", async () => {
    const res = await DELETE(req(), ctx(AID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ following: false });
    expect(mocks.unfollowArtist).toHaveBeenCalledWith(user.id, AID);
  });
});
