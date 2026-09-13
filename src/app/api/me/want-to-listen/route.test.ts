import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listMyWantToListen: vi.fn(),
  resolveWantToListenTarget: vi.fn(),
  toggleWantToListen: vi.fn(),
  removeWantToListenEntry: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/want-to-listen/want-to-listen", () => ({
  listMyWantToListen: mocks.listMyWantToListen,
  resolveWantToListenTarget: mocks.resolveWantToListenTarget,
  toggleWantToListen: mocks.toggleWantToListen,
  removeWantToListenEntry: mocks.removeWantToListenEntry,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const artistTarget = { type: "artist" as const, id: "00000000-0000-4000-8000-0000000000aa" };

const listResult = { items: [], page: 1, pageSize: 20, hasNext: false };

describe("GET /api/me/want-to-listen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista el want-to-listen propio paginado", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyWantToListen.mockResolvedValue(listResult);
    const response = await GET(new NextRequest("http://localhost/api/me/want-to-listen"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(listResult);
    expect(mocks.listMyWantToListen).toHaveBeenCalledWith(user.id, 1, 20);
  });

  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const response = await GET(new NextRequest("http://localhost/api/me/want-to-listen"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });
});

describe("POST /api/me/want-to-listen", () => {
  beforeEach(() => vi.clearAllMocks());

  function post(body: unknown) {
    return POST(
      new NextRequest("http://localhost/api/me/want-to-listen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("crea una entrada (toggle on) y responde 201", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.resolveWantToListenTarget.mockResolvedValue(artistTarget);
    const entry = { id: "e1", targetType: "artist", createdAt: "2026-01-01T00:00:00Z", target: {} };
    mocks.toggleWantToListen.mockResolvedValue(entry);

    const response = await post({ target: artistTarget });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ entry });
  });

  it("quita una entrada existente (toggle off) y responde 200 con entry null", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.resolveWantToListenTarget.mockResolvedValue(artistTarget);
    mocks.toggleWantToListen.mockResolvedValue(null);

    const response = await post({ target: artistTarget });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ entry: null });
  });

  it("rechaza un objetivo de tipo canción con VALIDATION_ERROR", async () => {
    const response = await post({ target: { type: "recording", id: artistTarget.id } });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.toggleWantToListen).not.toHaveBeenCalled();
  });

  it("propaga WANT_TO_LISTEN_TARGET_INVALID cuando el objetivo no existe", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.resolveWantToListenTarget.mockRejectedValue(
      new ApiError("WANT_TO_LISTEN_TARGET_INVALID", 404, "El objetivo no existe"),
    );
    const response = await post({ target: artistTarget });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "WANT_TO_LISTEN_TARGET_INVALID" });
  });

  it("sin sesión devuelve 401 AUTH_REQUIRED y no crea nada", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const response = await post({ target: artistTarget });
    expect(response.status).toBe(401);
    expect(mocks.toggleWantToListen).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/me/want-to-listen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("quita una entrada y responde 204", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.removeWantToListenEntry.mockResolvedValue(undefined);
    const response = await DELETE(
      new NextRequest("http://localhost/api/me/want-to-listen", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: artistTarget }),
      }),
    );
    expect(response.status).toBe(204);
    expect(mocks.removeWantToListenEntry).toHaveBeenCalledWith(artistTarget, user.id);
  });

  it("cuerpo inválido responde VALIDATION_ERROR", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost/api/me/want-to-listen", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
