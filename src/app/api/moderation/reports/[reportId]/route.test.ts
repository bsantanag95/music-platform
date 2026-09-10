import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { PATCH } from "./route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  updateReportStatus: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/moderation", () => ({ updateReportStatus: mocks.updateReportStatus }));

const REPORT_ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => vi.clearAllMocks());

describe("PATCH estado de reportes", () => {
  it("rechaza a quien no tiene permiso", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "resolved" }) }),
      { params: Promise.resolve({ reportId: REPORT_ID }) },
    );

    expect(response.status).toBe(403);
  });

  it("rechaza un body inválido", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "open" }) }),
      { params: Promise.resolve({ reportId: REPORT_ID }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.updateReportStatus).not.toHaveBeenCalled();
  });

  it("rechaza un reportId no-UUID", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "resolved" }) }),
      { params: Promise.resolve({ reportId: "no-es-uuid" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.updateReportStatus).not.toHaveBeenCalled();
  });

  it("resuelve un reporte pendiente y audita", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.updateReportStatus.mockResolvedValue({ id: REPORT_ID, status: "resolved" });

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "resolved" }) }),
      { params: Promise.resolve({ reportId: REPORT_ID }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.updateReportStatus).toHaveBeenCalledWith("moderator", REPORT_ID, "resolved");
  });

  it("propaga 404 cuando el reporte ya fue resuelto o no existe", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "moderator" });
    mocks.updateReportStatus.mockRejectedValue(new ApiError("MODERATION_REPORT_NOT_FOUND", 404, "El reporte no existe"));

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ status: "dismissed" }) }),
      { params: Promise.resolve({ reportId: REPORT_ID }) },
    );

    expect(response.status).toBe(404);
  });
});