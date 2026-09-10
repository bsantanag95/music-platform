import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  listSocialRestrictions: vi.fn(),
  suspendSocialActivity: vi.fn(),
  resolveUserByIdentifier: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/moderation-queries", () => ({ listSocialRestrictions: mocks.listSocialRestrictions }));
vi.mock("@/services/moderation", () => ({
  suspendSocialActivity: mocks.suspendSocialActivity,
  resolveUserByIdentifier: mocks.resolveUserByIdentifier,
}));

const USER_ID = "00000000-0000-4000-8000-000000000002";

beforeEach(() => vi.clearAllMocks());

describe("GET restricciones sociales", () => {
  it("rechaza a quien no tiene permiso de suspensión", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

    const response = await GET(new NextRequest("http://localhost/api/moderation/restrictions"));

    expect(response.status).toBe(403);
  });

  it("rechaza un userId no-UUID", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });

    const response = await GET(new NextRequest("http://localhost/api/moderation/restrictions?userId=no-es-uuid"));

    expect(response.status).toBe(400);
    expect(mocks.listSocialRestrictions).not.toHaveBeenCalled();
  });

  it("lista restricciones filtrando por userId cuando es válido", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.listSocialRestrictions.mockResolvedValue([{ id: "r1" }]);

    const response = await GET(new NextRequest(`http://localhost/api/moderation/restrictions?userId=${USER_ID}`));

    expect(response.status).toBe(200);
    expect(mocks.listSocialRestrictions).toHaveBeenCalledWith(USER_ID);
    expect(await response.json()).toEqual({ restrictions: [{ id: "r1" }] });
  });
});

describe("POST restricciones sociales", () => {
  const validBody = {
    userId: USER_ID,
    reason: "Spam",
    expiresAt: "2030-01-01T00:00:00.000Z",
  };

  it("rechaza a quien no tiene permiso de suspensión", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

    const response = await POST(
      new NextRequest("http://localhost", { method: "POST", body: JSON.stringify(validBody) }),
    );

    expect(response.status).toBe(403);
  });

  it("rechaza un body inválido", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });

    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ ...validBody, expiresAt: "2000-01-01T00:00:00.000Z" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.suspendSocialActivity).not.toHaveBeenCalled();
  });

  it("crea una suspensión y devuelve 201", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.suspendSocialActivity.mockResolvedValue({ id: "restriction-1", userId: USER_ID });

    const response = await POST(
      new NextRequest("http://localhost", { method: "POST", body: JSON.stringify(validBody) }),
    );

    expect(response.status).toBe(201);
    expect(mocks.suspendSocialActivity).toHaveBeenCalledWith("moderator", USER_ID, "Spam", new Date("2030-01-01T00:00:00.000Z"));
  });

  it("propaga 404 cuando el usuario no existe", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.suspendSocialActivity.mockRejectedValue(new ApiError("USER_NOT_FOUND", 404, "El usuario no existe"));

    const response = await POST(
      new NextRequest("http://localhost", { method: "POST", body: JSON.stringify(validBody) }),
    );

    expect(response.status).toBe(404);
  });

  it("suspende por username/email resolviendo el identificador", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.resolveUserByIdentifier.mockResolvedValue(USER_ID);
    mocks.suspendSocialActivity.mockResolvedValue({ id: "restriction-1", userId: USER_ID });

    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({
          identifier: "ana",
          reason: "Spam",
          expiresAt: "2030-01-01T00:00:00.000Z",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.resolveUserByIdentifier).toHaveBeenCalledWith("ana");
    expect(mocks.suspendSocialActivity).toHaveBeenCalledWith("moderator", USER_ID, "Spam", new Date("2030-01-01T00:00:00.000Z"));
  });

  it("rechaza un body sin userId ni identifier", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });

    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ reason: "Spam", expiresAt: "2030-01-01T00:00:00.000Z" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.suspendSocialActivity).not.toHaveBeenCalled();
  });
});