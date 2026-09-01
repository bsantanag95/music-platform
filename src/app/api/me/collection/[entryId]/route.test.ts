import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH, DELETE } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  updateEntry: vi.fn(),
  removeEntry: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/collection/collection", () => ({
  updateEntry: mocks.updateEntry,
  removeEntry: mocks.removeEntry,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const entryId = "00000000-0000-4000-8000-0000000000e1";
const params = (id: string) => ({ params: Promise.resolve({ entryId: id }) });

type ReqInit = { method?: string; headers?: Record<string, string>; body?: string };
function req(init?: ReqInit) {
  return new NextRequest(`http://localhost/api/me/collection/${entryId}`, init);
}

describe("PATCH /api/me/collection/[entryId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("edita una entrada propia", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateEntry.mockResolvedValue({ id: entryId, format: "cd" });
    const res = await PATCH(
      req({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: "cd" }),
      }),
      params(entryId),
    );
    expect(res.status).toBe(200);
    expect(mocks.updateEntry).toHaveBeenCalledWith(
      entryId,
      user.id,
      expect.objectContaining({ format: "cd" }),
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
    expect(mocks.updateEntry).not.toHaveBeenCalled();
  });

  it("id no-uuid devuelve 404 COLLECTION_ENTRY_NOT_FOUND", async () => {
    const res = await PATCH(
      req({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: "cd" }),
      }),
      params("no-uuid"),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "COLLECTION_ENTRY_NOT_FOUND" });
  });

  it("propaga COLLECTION_ENTRY_NOT_FOUND de una entrada ajena", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateEntry.mockRejectedValue(
      new ApiError("COLLECTION_ENTRY_NOT_FOUND", 404, "no existe"),
    );
    const res = await PATCH(
      req({
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ audience: "public" }),
      }),
      params(entryId),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/me/collection/[entryId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("borra una entrada propia con 204", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.removeEntry.mockResolvedValue(undefined);
    const res = await DELETE(req({ method: "DELETE" }), params(entryId));
    expect(res.status).toBe(204);
    expect(mocks.removeEntry).toHaveBeenCalledWith(entryId, user.id);
  });

  it("entrada inexistente devuelve 404", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.removeEntry.mockRejectedValue(new ApiError("COLLECTION_ENTRY_NOT_FOUND", 404, "x"));
    const res = await DELETE(req({ method: "DELETE" }), params(entryId));
    expect(res.status).toBe(404);
  });

  it("sin sesión devuelve 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const res = await DELETE(req({ method: "DELETE" }), params(entryId));
    expect(res.status).toBe(401);
  });
});
