import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { DELETE, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  likeComment: vi.fn(),
  unlikeComment: vi.fn(),
  requireUser: vi.fn(),
  requireSocialActivityAllowed: vi.fn(),
}));

vi.mock("@/services/social/comment-likes", () => ({ likeComment: mocks.likeComment, unlikeComment: mocks.unlikeComment }));
vi.mock("@/services/auth/authorization", () => ({
  requireUser: mocks.requireUser,
  requireSocialActivityAllowed: mocks.requireSocialActivityAllowed,
}));

const ID = "00000000-0000-4000-8000-000000000001";
const call = (handler: typeof PUT, id = ID) =>
  handler(new NextRequest("http://localhost", { method: "PUT" }), { params: Promise.resolve({ commentId: id }) });

describe("PUT/DELETE like de comentario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "user-id" });
    mocks.requireSocialActivityAllowed.mockResolvedValue(undefined);
  });

  it("rechaza ids que no son UUID antes de tocar la sesión", async () => {
    const response = await call(PUT, "no-uuid");
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_COMMENT" });
    expect(mocks.requireUser).not.toHaveBeenCalled();
  });

  it("PUT sin sesión responde AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await call(PUT);
    expect(response.status).toBe(401);
    expect(mocks.likeComment).not.toHaveBeenCalled();
  });

  it("PUT exige que no haya suspensión social", async () => {
    mocks.requireSocialActivityAllowed.mockRejectedValue(new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    const response = await call(PUT);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "SOCIAL_SUSPENSION_ACTIVE" });
    expect(mocks.likeComment).not.toHaveBeenCalled();
  });

  it("PUT devuelve el estado del servicio", async () => {
    mocks.likeComment.mockResolvedValue({ liked: true, likeCount: 3 });
    const response = await call(PUT);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ liked: true, likeCount: 3 });
    expect(mocks.likeComment).toHaveBeenCalledWith(ID, "user-id");
  });

  it("DELETE no consulta la suspensión social", async () => {
    mocks.requireSocialActivityAllowed.mockRejectedValue(new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    mocks.unlikeComment.mockResolvedValue({ liked: false, likeCount: null });
    const response = await call(DELETE as typeof PUT);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ liked: false, likeCount: null });
    expect(mocks.requireSocialActivityAllowed).not.toHaveBeenCalled();
  });
});
