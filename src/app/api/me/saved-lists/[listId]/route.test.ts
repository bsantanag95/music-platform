import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PATCH } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireSocialActivityAllowed: vi.fn(async () => undefined),
  unsaveList: vi.fn(),
  setListTracking: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({
  requireUser: mocks.requireUser,
  requireSocialActivityAllowed: mocks.requireSocialActivityAllowed,
}));
vi.mock("@/services/lists/saved-lists", () => ({
  unsaveList: mocks.unsaveList,
  setListTracking: mocks.setListTracking,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const listId = "00000000-0000-4000-8000-000000000003";
const params = (id: string) => ({ params: Promise.resolve({ listId: id }) });

describe("DELETE /api/me/saved-lists/[listId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("quita el guardado y responde 204 (idempotente)", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.unsaveList.mockResolvedValue(undefined);
    const response = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), params(listId));
    expect(response.status).toBe(204);
    expect(mocks.unsaveList).toHaveBeenCalledWith(user.id, listId);
  });

  it("id no-uuid responde 400", async () => {
    const response = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), params("nope"));
    expect(response.status).toBe(400);
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), params(listId));
    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/me/saved-lists/[listId]", () => {
  beforeEach(() => vi.clearAllMocks());

  function patchRequest(body: unknown) {
    return new NextRequest("http://localhost/x", { method: "PATCH", body: JSON.stringify(body) });
  }

  it("activa el tracking y devuelve la lista actualizada", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.setListTracking.mockResolvedValue({ id: listId, tracking: true });
    const response = await PATCH(patchRequest({ tracking: true }), params(listId));
    expect(response.status).toBe(200);
    expect(mocks.setListTracking).toHaveBeenCalledWith(user.id, listId, true);
    expect(await response.json()).toEqual({ list: { id: listId, tracking: true } });
  });

  it("cuerpo inválido responde 400 sin llamar al servicio", async () => {
    mocks.requireUser.mockResolvedValue(user);
    const response = await PATCH(patchRequest({ tracking: "yes" }), params(listId));
    expect(response.status).toBe(400);
    expect(mocks.setListTracking).not.toHaveBeenCalled();
  });

  it("id no-uuid responde 400", async () => {
    const response = await PATCH(patchRequest({ tracking: true }), params("nope"));
    expect(response.status).toBe(400);
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await PATCH(patchRequest({ tracking: true }), params(listId));
    expect(response.status).toBe(401);
  });
});
