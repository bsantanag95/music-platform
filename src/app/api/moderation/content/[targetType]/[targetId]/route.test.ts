import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { PATCH } from "./route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  hideComment: vi.fn(),
  restoreComment: vi.fn(),
  hideReview: vi.fn(),
  restoreReview: vi.fn(),
  hideList: vi.fn(),
  restoreList: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/moderation", () => ({
  hideComment: mocks.hideComment,
  restoreComment: mocks.restoreComment,
  hideReview: mocks.hideReview,
  restoreReview: mocks.restoreReview,
  hideList: mocks.hideList,
  restoreList: mocks.restoreList,
}));

const TARGET_ID = "00000000-0000-4000-8000-000000000004";

beforeEach(() => vi.clearAllMocks());

function patch(targetType: string, targetId: string, body: unknown) {
  return PATCH(
    new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify(body) }),
    { params: Promise.resolve({ targetType, targetId }) },
  );
}

describe("PATCH acciones de moderación sobre contenido", () => {
  it("rechaza a quien no tiene permiso", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

    const response = await patch("comment", TARGET_ID, { action: "hide", reason: "Spam" });

    expect(response.status).toBe(403);
    expect(mocks.hideComment).not.toHaveBeenCalled();
  });

  it("rechaza un body sin motivo", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });

    const response = await patch("comment", TARGET_ID, { action: "hide", reason: "" });

    expect(response.status).toBe(400);
    expect(mocks.hideComment).not.toHaveBeenCalled();
  });

  it("rechaza un targetType desconocido", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });

    const response = await patch("artist", TARGET_ID, { action: "hide", reason: "Spam" });

    expect(response.status).toBe(400);
    expect(mocks.hideComment).not.toHaveBeenCalled();
  });

  it("rechaza un targetId no-UUID", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });

    const response = await patch("comment", "no-es-uuid", { action: "hide", reason: "Spam" });

    expect(response.status).toBe(400);
    expect(mocks.hideComment).not.toHaveBeenCalled();
  });

  it("oculta un comentario", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.hideComment.mockResolvedValue(undefined);

    const response = await patch("comment", TARGET_ID, { action: "hide", reason: "Spam" });

    expect(response.status).toBe(200);
    expect(mocks.hideComment).toHaveBeenCalledWith("moderator", TARGET_ID, "Spam");
  });

  it("restaura una reseña", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.restoreReview.mockResolvedValue(undefined);

    const response = await patch("review", TARGET_ID, { action: "restore", reason: "Falsa alarma" });

    expect(response.status).toBe(200);
    expect(mocks.restoreReview).toHaveBeenCalledWith("moderator", TARGET_ID, "Falsa alarma");
  });

  it("oculta una lista", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.hideList.mockResolvedValue(undefined);

    const response = await patch("list", TARGET_ID, { action: "hide", reason: "Spam" });

    expect(response.status).toBe(200);
    expect(mocks.hideList).toHaveBeenCalledWith("moderator", TARGET_ID, "Spam");
  });

  it("propaga 404 cuando el objetivo no existe", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.hideComment.mockRejectedValue(new ApiError("COMMENT_NOT_FOUND", 404, "El comentario no existe"));

    const response = await patch("comment", TARGET_ID, { action: "hide", reason: "Spam" });

    expect(response.status).toBe(404);
  });
});