import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { DELETE, PATCH } from "./route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  updateEditorialDraft: vi.fn(),
  deleteEditorialDraft: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/lists/editorial", () => ({
  updateEditorialDraft: mocks.updateEditorialDraft,
  deleteEditorialDraft: mocks.deleteEditorialDraft,
}));

const LIST_ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => vi.clearAllMocks());

describe("PATCH borrador editorial", () => {
  it("rechaza a quien no tiene permiso de autoría", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ title: "X" }) }),
      { params: Promise.resolve({ listId: LIST_ID }) },
    );

    expect(response.status).toBe(403);
  });

  it("devuelve 404 ante un listId no-UUID", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "person-1" });

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ title: "X" }) }),
      { params: Promise.resolve({ listId: "no-es-uuid" }) },
    );

    expect(response.status).toBe(404);
    expect(mocks.updateEditorialDraft).not.toHaveBeenCalled();
  });

  it("edita el borrador con el permiso de autoría", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "person-1" });
    mocks.updateEditorialDraft.mockResolvedValue({ id: LIST_ID, title: "X" });

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({ title: "X" }) }),
      { params: Promise.resolve({ listId: LIST_ID }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith("editorial.author");
    expect(mocks.updateEditorialDraft).toHaveBeenCalledWith("person-1", LIST_ID, { title: "X" });
  });

  it("rechaza un body sin campos", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "person-1" });

    const response = await PATCH(
      new NextRequest("http://localhost", { method: "PATCH", body: JSON.stringify({}) }),
      { params: Promise.resolve({ listId: LIST_ID }) },
    );

    expect(response.status).toBe(400);
  });
});

describe("DELETE borrador editorial", () => {
  it("borra un borrador nunca publicado con el permiso de autoría", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "person-1" });
    mocks.deleteEditorialDraft.mockResolvedValue(undefined);

    const response = await DELETE(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ listId: LIST_ID }),
    });

    expect(response.status).toBe(204);
    expect(mocks.requirePermission).toHaveBeenCalledWith("editorial.author");
  });

  it("devuelve 404 cuando la lista no es un borrador borrable", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "person-1" });
    mocks.deleteEditorialDraft.mockRejectedValue(new ApiError("LIST_NOT_FOUND", 404, "No existe"));

    const response = await DELETE(new NextRequest("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ listId: LIST_ID }),
    });

    expect(response.status).toBe(404);
  });
});
