import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireSocialActivityAllowed: vi.fn(),
  getArtistJourneyDetail: vi.fn(),
  activateArtistJourney: vi.fn(),
  deleteArtistJourney: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({
  requireUser: mocks.requireUser,
  requireSocialActivityAllowed: mocks.requireSocialActivityAllowed,
}));
vi.mock("@/services/artist-journeys/artist-journeys", () => ({
  getArtistJourneyDetail: mocks.getArtistJourneyDetail,
  activateArtistJourney: mocks.activateArtistJourney,
  deleteArtistJourney: mocks.deleteArtistJourney,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const artistId = "00000000-0000-4000-8000-0000000000aa";
const journey = {
  artistId,
  state: "in_progress",
  activatedAt: "2026-01-01T00:00:00Z",
  progress: { selectedCount: 1, listenedCount: 0 },
  albums: [],
};

function ctx(id = artistId) {
  return { params: Promise.resolve({ artistId: id }) };
}

describe("GET /api/me/artist-journeys/[artistId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el detalle propio", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.getArtistJourneyDetail.mockResolvedValue(journey);
    const response = await GET(new NextRequest("http://localhost/x"), ctx());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ journey });
  });

  it("devuelve journey null cuando no hay recorrido activado", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.getArtistJourneyDetail.mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost/x"), ctx());
    expect(await response.json()).toEqual({ journey: null });
  });

  it("id de artista inválido responde ARTIST_NOT_FOUND sin llamar al servicio", async () => {
    const response = await GET(new NextRequest("http://localhost/x"), ctx("no-es-uuid"));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "ARTIST_NOT_FOUND" });
    expect(mocks.getArtistJourneyDetail).not.toHaveBeenCalled();
  });

  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const response = await GET(new NextRequest("http://localhost/x"), ctx());
    expect(response.status).toBe(401);
  });
});

describe("POST /api/me/artist-journeys/[artistId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("activa el recorrido y responde 201", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.requireSocialActivityAllowed.mockResolvedValue(undefined);
    mocks.activateArtistJourney.mockResolvedValue(journey);
    const response = await POST(new NextRequest("http://localhost/x", { method: "POST" }), ctx());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ journey });
    expect(mocks.activateArtistJourney).toHaveBeenCalledWith(user.id, artistId);
  });

  it("cuenta suspendida propaga SOCIAL_SUSPENSION_ACTIVE sin activar", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.requireSocialActivityAllowed.mockRejectedValue(
      new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "Suspendido"),
    );
    const response = await POST(new NextRequest("http://localhost/x", { method: "POST" }), ctx());
    expect(response.status).toBe(403);
    expect(mocks.activateArtistJourney).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/me/artist-journeys/[artistId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("borra el recorrido y responde 204", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.requireSocialActivityAllowed.mockResolvedValue(undefined);
    mocks.deleteArtistJourney.mockResolvedValue(undefined);
    const response = await DELETE(
      new NextRequest("http://localhost/x", { method: "DELETE" }),
      ctx(),
    );
    expect(response.status).toBe(204);
    expect(mocks.deleteArtistJourney).toHaveBeenCalledWith(user.id, artistId);
  });

  it("recorrido ajeno o inexistente propaga ARTIST_JOURNEY_NOT_FOUND", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.requireSocialActivityAllowed.mockResolvedValue(undefined);
    mocks.deleteArtistJourney.mockRejectedValue(
      new ApiError("ARTIST_JOURNEY_NOT_FOUND", 404, "No existe"),
    );
    const response = await DELETE(
      new NextRequest("http://localhost/x", { method: "DELETE" }),
      ctx(),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "ARTIST_JOURNEY_NOT_FOUND" });
  });
});
