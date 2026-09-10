import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  listReviews: vi.fn(),
  createOrReplaceReview: vi.fn(),
  resolveSocialTarget: vi.fn(),
  requireUser: vi.fn(),
  requireSocialActivityAllowed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/reviews", () => mocks);
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser, requireSocialActivityAllowed: mocks.requireSocialActivityAllowed }));

const ID = "00000000-0000-4000-8000-000000000001";
const params = (target = "release-group") => ({ params: Promise.resolve({ target, id: ID }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveSocialTarget.mockResolvedValue({ type: "release-group", id: ID, column: "releaseGroupId" });
});

describe("GET reseñas", () => {
  it.each([
    ["page", "0"],
    ["pageSize", "101"],
  ])("rechaza %s=%s con VALIDATION_ERROR", async (parameter, value) => {
    const request = new NextRequest(`http://localhost/x?${parameter}=${value}`);
    const response = await GET(request, params());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listReviews).not.toHaveBeenCalled();
  });

  it("lista con paginación por defecto y es pública", async () => {
    mocks.listReviews.mockResolvedValue({ reviews: [], page: 1, pageSize: 20, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/x"), params());
    expect(response.status).toBe(200);
    expect(mocks.listReviews).toHaveBeenCalledWith(expect.anything(), 1, 20);
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });
});

describe("POST reseña", () => {
  it("crea la reseña y la devuelve dentro de review", async () => {
    const review = { id: "r1", title: null, body: "Texto", rating: { stars: 4, detailedScore: null } };
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.createOrReplaceReview.mockResolvedValue(review);

    const response = await POST(
      new NextRequest("http://localhost/x", { method: "POST", body: JSON.stringify({ body: "Texto", stars: 4 }) }),
      params(),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ review });
  });

  it.each([
    ["title ausente", { body: "Una reseña sin título." }],
    ["title null explícito", { body: "Una reseña sin título.", title: null }],
    ["title cadena vacía", { body: "Una reseña sin título.", title: "  " }],
  ])("acepta una reseña sin título (%s) y persiste title null", async (_label, payload) => {
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.createOrReplaceReview.mockResolvedValue({ id: "r1", title: null, body: "x", rating: null });

    const response = await POST(
      new NextRequest("http://localhost/x", { method: "POST", body: JSON.stringify(payload) }),
      params(),
    );

    expect(response.status).toBe(201);
    expect(mocks.createOrReplaceReview).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      expect.objectContaining({ title: null, body: "Una reseña sin título." }),
    );
  });

  it("rechaza un body vacío con VALIDATION_ERROR antes de tocar el servicio", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    const response = await POST(
      new NextRequest("http://localhost/x", { method: "POST", body: JSON.stringify({ body: "  " }) }),
      params(),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.createOrReplaceReview).not.toHaveBeenCalled();
  });

  it("propaga REVIEW_TARGET_NOT_SUPPORTED del servicio", async () => {
    mocks.requireUser.mockResolvedValue({ id: "user-1" });
    mocks.createOrReplaceReview.mockRejectedValue(
      new ApiError("REVIEW_TARGET_NOT_SUPPORTED", 400, "no"),
    );
    const response = await POST(
      new NextRequest("http://localhost/x", { method: "POST", body: JSON.stringify({ body: "Texto" }) }),
      params("artist"),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "REVIEW_TARGET_NOT_SUPPORTED" });
  });
});
