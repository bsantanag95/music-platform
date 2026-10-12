import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { DELETE, PATCH } from "./route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  updateFeaturedSchedule: vi.fn(),
  unfeatureList: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/discovery/featured", () => ({
  updateFeaturedSchedule: mocks.updateFeaturedSchedule,
  unfeatureList: mocks.unfeatureList,
}));

const LIST_ID = "00000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ listId: LIST_ID }) };

function patch(body: unknown) {
  return new NextRequest("http://localhost", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("PATCH vigencia de una destacada", () => {
  it("exige editorial.publish", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));
    expect((await PATCH(patch({ weight: 2 }), context)).status).toBe(403);
  });

  it("rechaza un cuerpo vacío con 400", async () => {
    expect((await PATCH(patch({}), context)).status).toBe(400);
  });

  it("aplica la vigencia", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin-1" });
    const response = await PATCH(patch({ expiresAt: "2026-12-01T00:00:00Z" }), context);
    expect(response.status).toBe(200);
    expect(mocks.updateFeaturedSchedule).toHaveBeenCalledWith("admin-1", LIST_ID, {
      startsAt: undefined,
      expiresAt: new Date("2026-12-01T00:00:00Z"),
      weight: undefined,
    });
  });

  it("responde 404 con FEATURED_NOT_FOUND para un id mal formado", async () => {
    const response = await PATCH(patch({ weight: 1 }), { params: Promise.resolve({ listId: "x" }) });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: "FEATURED_NOT_FOUND" });
  });
});

describe("DELETE quitar una destacada", () => {
  it("exige editorial.publish", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));
    expect((await DELETE(new NextRequest("http://localhost", { method: "DELETE" }), context)).status).toBe(403);
    expect(mocks.unfeatureList).not.toHaveBeenCalled();
  });

  it("quita y responde 204", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin-1" });
    const response = await DELETE(new NextRequest("http://localhost", { method: "DELETE" }), context);
    expect(response.status).toBe(204);
    expect(mocks.unfeatureList).toHaveBeenCalledWith("admin-1", LIST_ID);
  });
});
