import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, PUT } from "./route";
import * as auth from "@/services/auth/authorization";
import * as social from "@/services/social";

vi.mock("@/services/auth/authorization", () => ({ getCurrentUser: vi.fn(), requireUser: vi.fn() }));
vi.mock("@/services/social", () => ({ resolveSocialTarget: vi.fn(), getRatings: vi.fn(), upsertRating: vi.fn(), deleteRating: vi.fn() }));

const id = "00000000-0000-4000-8000-000000000001";
const target = { type: "artist" as const, id, column: "artistId" as const };

describe("rutas sociales de ratings", () => {
  it("rechaza un objetivo inválido antes de consultar la base", async () => {
    const response = await GET(new NextRequest("http://localhost"), { params: Promise.resolve({ target: "invalid", id }) });
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_TARGET");
  });

  it("lee agregados sin exigir sesión", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);
    vi.mocked(social.resolveSocialTarget).mockResolvedValue(target);
    vi.mocked(social.getRatings).mockResolvedValue({ own: null, aggregate: { count: 1, averageStars: 4, averageDetailedScore: 80 } });
    const response = await GET(new NextRequest("http://localhost"), { params: Promise.resolve({ target: "artist", id }) });
    expect(response.status).toBe(200);
    expect(social.getRatings).toHaveBeenCalledWith(target, undefined);
  });

  it("no acepta user_id en la mutación y usa el usuario de sesión", async () => {
    vi.mocked(auth.requireUser).mockResolvedValue({ id, username: "ana", email: "ana@example.com", displayName: null, passwordHash: null, createdAt: new Date() });
    vi.mocked(social.resolveSocialTarget).mockResolvedValue(target);
    vi.mocked(social.upsertRating).mockResolvedValue({ id, userId: id, artistId: id, releaseGroupId: null, recordingId: null, stars: 4, detailedScore: 80, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    const response = await PUT(new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify({ stars: 4, detailedScore: 80, user_id: "attacker" }) }), { params: Promise.resolve({ target: "artist", id }) });
    expect(response.status).toBe(200);
    expect(social.upsertRating).toHaveBeenCalledWith(target, id, 4, 80);
    expect(await response.json()).toEqual({ rating: expect.objectContaining({ stars: 4, detailedScore: 80 }) });
  });
});
