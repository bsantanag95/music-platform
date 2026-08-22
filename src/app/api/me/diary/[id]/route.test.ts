import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH, DELETE } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  updateListenEntry: vi.fn(),
  deleteListenEntry: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/services/diary/diary", () => ({
  updateListenEntry: mocks.updateListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
}));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const entryId = "00000000-0000-4000-8000-000000000003";
const targetId = "00000000-0000-4000-8000-000000000002";
const entry = {
  id: entryId,
  listenContext: "rediscovery",
  body: "Este bajo está ridículamente bueno",
  reaction: "obsessed",
  audience: "private",
  createdAt: "2026-01-01T00:00:00.000Z",
  target: { type: "artist", id: targetId, title: "Pink Floyd", subtitle: null, coverThumbUrl: null },
};

function patchRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/me/diary/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("diario API (PATCH/DELETE)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PATCH amplía la entrada y devuelve 200 con entry", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateListenEntry.mockResolvedValue(entry);
    const response = await PATCH(patchRequest({ body: "Este bajo está ridículamente bueno", reaction: "obsessed" }), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ entry });
    expect(mocks.updateListenEntry).toHaveBeenCalledWith(
      entryId,
      user.id,
      expect.objectContaining({ reaction: "obsessed" }),
    );
  });

  it("PATCH rechaza un body vacío o inválido con VALIDATION_ERROR", async () => {
    const response = await PATCH(patchRequest({}), { params: Promise.resolve({ id: entryId }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.updateListenEntry).not.toHaveBeenCalled();
  });

  it("PATCH con id no UUID devuelve 404 LISTEN_ENTRY_NOT_FOUND", async () => {
    const response = await PATCH(patchRequest({ reaction: "loved" }), {
      params: Promise.resolve({ id: "no-es-uuid" }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "LISTEN_ENTRY_NOT_FOUND" });
  });

  it("PATCH sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const response = await PATCH(patchRequest({ reaction: "loved" }), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("DELETE borra la entrada propia y devuelve 204", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.deleteListenEntry.mockResolvedValue(undefined);
    const response = await DELETE(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(response.status).toBe(204);
    expect(mocks.deleteListenEntry).toHaveBeenCalledWith(entryId, user.id);
  });

  it("DELETE de una entrada inexistente devuelve 404", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.deleteListenEntry.mockRejectedValue(
      new ApiError("LISTEN_ENTRY_NOT_FOUND", 404, "La escucha no existe"),
    );
    const response = await DELETE(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: entryId }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "LISTEN_ENTRY_NOT_FOUND" });
  });
});