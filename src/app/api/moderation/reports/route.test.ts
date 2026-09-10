import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  requireUser: vi.fn(),
  listModerationReports: vi.fn(),
  reportContent: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({
  requirePermission: mocks.requirePermission,
  requireUser: mocks.requireUser,
}));
vi.mock("@/services/moderation-queries", () => ({ listModerationReports: mocks.listModerationReports }));
vi.mock("@/services/moderation", () => ({ reportContent: mocks.reportContent }));

const USER_ID = "00000000-0000-4000-8000-000000000002";

beforeEach(() => vi.clearAllMocks());

describe("GET reportes de moderación", () => {
  it("rechaza a quien no tiene permiso", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

    const response = await GET(new NextRequest("http://localhost/api/moderation/reports"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Sin permiso", code: "ROLE_REQUIRED" });
  });

  it("devuelve la cola paginada al moderador", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.listModerationReports.mockResolvedValue({ reports: [], page: 1, pageSize: 20, hasNext: false });

    const response = await GET(new NextRequest("http://localhost/api/moderation/reports?page=1"));

    expect(response.status).toBe(200);
    expect(mocks.listModerationReports).toHaveBeenCalledWith({ status: "pending", page: 1, pageSize: 20 });
  });

  it("pasa el filtro targetType=user", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.listModerationReports.mockResolvedValue({ reports: [], page: 1, pageSize: 20, hasNext: false });

    await GET(new NextRequest("http://localhost/api/moderation/reports?targetType=user"));

    expect(mocks.listModerationReports).toHaveBeenCalledWith({
      status: "pending",
      targetType: "user",
      page: 1,
      pageSize: 20,
    });
  });
});

describe("POST reportes de moderación", () => {
  it("rechaza sin sesión", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Se requiere una sesión activa"));

    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ targetType: "user", targetId: USER_ID, reason: "Spam" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("reporta un perfil de usuario", async () => {
    mocks.requireUser.mockResolvedValue({ id: "reporter" });
    mocks.reportContent.mockResolvedValue({ id: "report-1", userId: USER_ID });

    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ targetType: "user", targetId: USER_ID, reason: "Spam" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.reportContent).toHaveBeenCalledWith("reporter", { userId: USER_ID }, "Spam");
  });

  it("rechaza un body inválido", async () => {
    mocks.requireUser.mockResolvedValue({ id: "reporter" });

    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ targetType: "album", targetId: USER_ID, reason: "Spam" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.reportContent).not.toHaveBeenCalled();
  });
});