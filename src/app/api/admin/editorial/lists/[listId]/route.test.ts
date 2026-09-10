import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { DELETE, PATCH } from "./route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  publishOfficialList: vi.fn(),
  unpublishOfficialList: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/lists/editorial", () => ({
  publishOfficialList: mocks.publishOfficialList,
  unpublishOfficialList: mocks.unpublishOfficialList,
}));

const LIST_ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => vi.clearAllMocks());

describe("PATCH listas editoriales", () => {
  it("rechaza a quien no tiene permiso editorial", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({}) }),
      { params: Promise.resolve({ listId: LIST_ID }) },
    );

    expect(response.status).toBe(403);
  });

  it("devuelve 404 ante un listId no-UUID", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin" });

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({}) }),
      { params: Promise.resolve({ listId: "no-es-uuid" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.publishOfficialList).not.toHaveBeenCalled();
  });

  it("publica una lista para un administrador", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin" });
    mocks.publishOfficialList.mockResolvedValue({ id: LIST_ID, isOfficial: true });

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({}) }),
      { params: Promise.resolve({ listId: LIST_ID }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("devuelve 404 cuando la lista no existe o está moderada", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin" });
    mocks.publishOfficialList.mockResolvedValue(null);

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({}) }),
      { params: Promise.resolve({ listId: LIST_ID }) },
    );

    expect(response.status).toBe(404);
  });
});

describe("DELETE listas editoriales", () => {
  it("retira una lista oficial para un administrador", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin" });
    mocks.unpublishOfficialList.mockResolvedValue({ id: LIST_ID, isOfficial: false });

    const response = await DELETE(
      new NextRequest("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ listId: LIST_ID }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("devuelve 404 cuando la lista no existe o ya fue retirada", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin" });
    mocks.unpublishOfficialList.mockResolvedValue(null);

    const response = await DELETE(
      new NextRequest("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ listId: LIST_ID }) },
    );

    expect(response.status).toBe(404);
  });

  it("devuelve 404 ante un listId no-UUID", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin" });

    const response = await DELETE(
      new NextRequest("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ listId: "no-es-uuid" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.unpublishOfficialList).not.toHaveBeenCalled();
  });
});