import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { DELETE } from "./route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  revokeSocialSuspension: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/moderation", () => ({ revokeSocialSuspension: mocks.revokeSocialSuspension }));

const RESTRICTION_ID = "00000000-0000-4000-8000-000000000003";

beforeEach(() => vi.clearAllMocks());

describe("DELETE revocación de suspensión social", () => {
  it("rechaza a quien no tiene permiso de suspensión", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

    const response = await DELETE(
      new NextRequest("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ restrictionId: RESTRICTION_ID }) },
    );

    expect(response.status).toBe(403);
  });

  it("rechaza un restrictionId no-UUID", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });

    const response = await DELETE(
      new NextRequest("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ restrictionId: "no-es-uuid" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.revokeSocialSuspension).not.toHaveBeenCalled();
  });

  it("revoca una restricción activa", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.revokeSocialSuspension.mockResolvedValue(undefined);

    const response = await DELETE(
      new NextRequest("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ restrictionId: RESTRICTION_ID }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("propaga 404 cuando la restricción no existe o ya fue revocada", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.revokeSocialSuspension.mockRejectedValue(new ApiError("RESTRICTION_NOT_FOUND", 404, "La restricción no existe o ya fue revocada"));

    const response = await DELETE(
      new NextRequest("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ restrictionId: RESTRICTION_ID }) },
    );

    expect(response.status).toBe(404);
  });
});