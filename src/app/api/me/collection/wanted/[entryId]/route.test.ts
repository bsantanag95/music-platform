import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PATCH } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  removeWantedEntry: vi.fn(),
  updateWantedEntry: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/collection/wanted", () => ({
  removeWantedEntry: mocks.removeWantedEntry,
  updateWantedEntry: mocks.updateWantedEntry,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const entryId = "00000000-0000-4000-8000-0000000000e1";
const params = (id: string) => ({ params: Promise.resolve({ entryId: id }) });

type ReqInit = { method?: string; headers?: Record<string, string>; body?: string };
function req(init?: ReqInit) {
  return new NextRequest(`http://localhost/api/me/collection/wanted/${entryId}`, init);
}

describe("PATCH /api/me/collection/wanted/[entryId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("edita una entrada propia", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateWantedEntry.mockResolvedValue({ id: entryId, format: "cd" });
    const res = await PATCH(
      req({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: "cd" }),
      }),
      params(entryId),
    );
    expect(res.status).toBe(200);
    expect(mocks.updateWantedEntry).toHaveBeenCalledWith(
      entryId,
      user.id,
      expect.objectContaining({ format: "cd" }),
    );
  });

  it("acepta format: null para volver a 'cualquier formato'", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateWantedEntry.mockResolvedValue({ id: entryId, format: null });
    const res = await PATCH(
      req({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: null }),
      }),
      params(entryId),
    );
    expect(res.status).toBe(200);
    expect(mocks.updateWantedEntry).toHaveBeenCalledWith(
      entryId,
      user.id,
      expect.objectContaining({ format: null }),
    );
  });

  it("rechaza un body vacío con VALIDATION_ERROR", async () => {
    const res = await PATCH(
      req({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      params(entryId),
    );
    expect(res.status).toBe(400);
    expect(mocks.updateWantedEntry).not.toHaveBeenCalled();
  });

  it("id no-uuid devuelve 404 WANTED_ENTRY_NOT_FOUND", async () => {
    const res = await PATCH(
      req({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: "cd" }),
      }),
      params("no-uuid"),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "WANTED_ENTRY_NOT_FOUND" });
  });

  it("propaga WANTED_ENTRY_NOT_FOUND de una entrada ajena", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateWantedEntry.mockRejectedValue(new ApiError("WANTED_ENTRY_NOT_FOUND", 404, "no existe"));
    const res = await PATCH(
      req({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: "x" }),
      }),
      params(entryId),
    );
    expect(res.status).toBe(404);
  });

  it("sin sesión devuelve 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const res = await PATCH(
      req({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: "cd" }),
      }),
      params(entryId),
    );
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/me/collection/wanted/[entryId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("borra una entrada propia con 204", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.removeWantedEntry.mockResolvedValue(undefined);
    const res = await DELETE(req({ method: "DELETE" }), params(entryId));
    expect(res.status).toBe(204);
    expect(mocks.removeWantedEntry).toHaveBeenCalledWith(entryId, user.id);
  });

  it("id no-uuid devuelve 404 WANTED_ENTRY_NOT_FOUND", async () => {
    const res = await DELETE(req({ method: "DELETE" }), params("no-uuid"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "WANTED_ENTRY_NOT_FOUND" });
  });

  it("entrada inexistente o ajena devuelve 404", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.removeWantedEntry.mockRejectedValue(new ApiError("WANTED_ENTRY_NOT_FOUND", 404, "x"));
    const res = await DELETE(req({ method: "DELETE" }), params(entryId));
    expect(res.status).toBe(404);
  });

  it("sin sesión devuelve 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const res = await DELETE(req({ method: "DELETE" }), params(entryId));
    expect(res.status).toBe(401);
  });
});
