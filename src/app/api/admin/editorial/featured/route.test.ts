import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  featureList: vi.fn(),
  listFeaturedAdmin: vi.fn(),
  listEligibleForFeature: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/discovery/featured", () => ({
  featureList: mocks.featureList,
  listFeaturedAdmin: mocks.listFeaturedAdmin,
  listEligibleForFeature: mocks.listEligibleForFeature,
}));

const LIST_ID = "00000000-0000-4000-8000-000000000001";

function post(body: unknown) {
  return new NextRequest("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET destacadas (consola editorial)", () => {
  it("exige solo editorial.author", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "curator-1" });
    mocks.listFeaturedAdmin.mockResolvedValue([]);
    mocks.listEligibleForFeature.mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith("editorial.author");
    await expect(response.json()).resolves.toEqual({ featured: [], eligible: [] });
  });

  it("responde 403 sin el permiso", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));
    expect((await GET()).status).toBe(403);
  });
});

describe("POST destacar una lista", () => {
  it("exige editorial.publish: un curador con solo autoría recibe 403", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

    const response = await POST(post({ listId: LIST_ID, family: "discovery" }));

    expect(response.status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith("editorial.publish");
    expect(mocks.featureList).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo inválido con 400", async () => {
    const response = await POST(post({ listId: "no-es-uuid", family: "discovery" }));
    expect(response.status).toBe(400);
    expect(mocks.featureList).not.toHaveBeenCalled();
  });

  it("sin familia, o con una desconocida, responde 400 (ADR 0038)", async () => {
    expect((await POST(post({ listId: LIST_ID }))).status).toBe(400);
    expect((await POST(post({ listId: LIST_ID, family: "inventada" }))).status).toBe(400);
    expect(mocks.featureList).not.toHaveBeenCalled();
  });

  it("destaca con vigencia y responde 201", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin-1" });
    mocks.featureList.mockResolvedValue(undefined);

    const response = await POST(
      post({ listId: LIST_ID, family: "awards", startsAt: "2026-11-01T00:00:00Z", expiresAt: null, weight: 3 }),
    );

    expect(response.status).toBe(201);
    expect(mocks.featureList).toHaveBeenCalledWith("admin-1", LIST_ID, {
      family: "awards",
      startsAt: new Date("2026-11-01T00:00:00Z"),
      expiresAt: null,
      weight: 3,
    });
  });

  it("propaga el código estable de una lista no publicada", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin-1" });
    mocks.featureList.mockRejectedValue(new ApiError("FEATURE_NOT_PUBLISHED", 409, "No publicada"));

    const response = await POST(post({ listId: LIST_ID, family: "discovery" }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "FEATURE_NOT_PUBLISHED" });
  });
});
