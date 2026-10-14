import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { PUT } from "./route";

const mocks = vi.hoisted(() => ({ requirePermission: vi.fn(), reorderFeatured: vi.fn() }));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/discovery/featured", () => ({ reorderFeatured: mocks.reorderFeatured }));

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

function put(body: unknown) {
  return new NextRequest("http://localhost", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("PUT orden de destacadas", () => {
  it("exige editorial.publish", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));
    expect((await PUT(put({ listIds: [A] }))).status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith("editorial.publish");
  });

  it("ignora un grupo en el cuerpo: el orden es uno solo (ADR 0038)", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin-1" });
    // `group` sobra desde el ADR 0038; un cuerpo que todavía lo envíe se acepta y se ignora.
    expect((await PUT(put({ group: "curated", listIds: [A] }))).status).toBe(200);
    expect(mocks.reorderFeatured).toHaveBeenCalledWith("admin-1", [A]);
  });

  it("rechaza una lista vacía con 400", async () => {
    expect((await PUT(put({ listIds: [] }))).status).toBe(400);
  });

  it("reordena y responde ok", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin-1" });
    const response = await PUT(put({ listIds: [B, A] }));
    expect(response.status).toBe(200);
    expect(mocks.reorderFeatured).toHaveBeenCalledWith("admin-1", [B, A]);
  });

  it("propaga FEATURED_ORDER_CONFLICT como 409", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin-1" });
    mocks.reorderFeatured.mockRejectedValue(new ApiError("FEATURED_ORDER_CONFLICT", 409, "Conflicto"));
    const response = await PUT(put({ listIds: [A] }));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "FEATURED_ORDER_CONFLICT" });
  });
});
