import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  listMyDiary: vi.fn(),
  createListenEntry: vi.fn(),
  resolveDiaryTarget: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/services/diary/diary", () => ({
  listMyDiary: mocks.listMyDiary,
  createListenEntry: mocks.createListenEntry,
  resolveDiaryTarget: mocks.resolveDiaryTarget,
}));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const targetId = "00000000-0000-4000-8000-000000000002";
const entry = {
  id: "00000000-0000-4000-8000-000000000003",
  listenContext: "first_listen",
  body: null,
  reaction: null,
  audience: "followers",
  createdAt: "2026-01-01T00:00:00.000Z",
  target: { type: "artist", id: targetId, title: "Pink Floyd", subtitle: null, coverThumbUrl: null },
};

describe("diario API (GET/POST)", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["page", "NaN"],
    ["page", "0"],
    ["pageSize", "0"],
    ["pageSize", "101"],
  ])("GET rechaza %s=%s con VALIDATION_ERROR", async (parameter, value) => {
    const request = new NextRequest(`http://localhost/api/me/diary?${parameter}=${value}`);
    const response = await GET(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listMyDiary).not.toHaveBeenCalled();
  });

  it("GET lista el diario propio paginado", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyDiary.mockResolvedValue({ entries: [entry], page: 2, pageSize: 10, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/api/me/diary?page=2&pageSize=10"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ entries: [entry], page: 2 });
    expect(mocks.listMyDiary).toHaveBeenCalledWith(user.id, 2, 10, {
      q: undefined,
      context: undefined,
      reaction: undefined,
      audience: undefined,
    });
  });

  it.each([
    ["context", "invalido"],
    ["reaction", "invalido"],
    ["audience", "invalido"],
  ])("GET rechaza %s=%s con VALIDATION_ERROR", async (parameter, value) => {
    const request = new NextRequest(`http://localhost/api/me/diary?${parameter}=${value}`);
    const response = await GET(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listMyDiary).not.toHaveBeenCalled();
  });

  it("GET acepta reaction=none como filtro válido", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyDiary.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/api/me/diary?reaction=none"));
    expect(response.status).toBe(200);
    expect(mocks.listMyDiary).toHaveBeenCalledWith(
      user.id,
      1,
      20,
      expect.objectContaining({ reaction: "none" }),
    );
  });

  it("GET combina búsqueda y filtros válidos", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyDiary.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
    const response = await GET(
      new NextRequest(
        "http://localhost/api/me/diary?q=radiohead&context=relisten&reaction=loved&audience=public",
      ),
    );
    expect(response.status).toBe(200);
    expect(mocks.listMyDiary).toHaveBeenCalledWith(user.id, 1, 20, {
      q: "radiohead",
      context: "relisten",
      reaction: "loved",
      audience: "public",
    });
  });

  it("GET sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const response = await GET(new NextRequest("http://localhost/api/me/diary"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("POST registra una escucha con 201", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.resolveDiaryTarget.mockResolvedValue({ type: "artist", id: targetId, column: "artistId" });
    mocks.createListenEntry.mockResolvedValue(entry);
    const response = await POST(
      new NextRequest("http://localhost/api/me/diary", {
        method: "POST",
        body: JSON.stringify({ target: { type: "artist", id: targetId } }),
      }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ entry });
    expect(mocks.createListenEntry).toHaveBeenCalledWith(
      { type: "artist", id: targetId, column: "artistId" },
      user.id,
    );
  });

  it("POST rechaza un body inválido con VALIDATION_ERROR", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/me/diary", {
        method: "POST",
        body: JSON.stringify({ target: { type: "album", id: targetId } }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.createListenEntry).not.toHaveBeenCalled();
  });

  it("POST con objetivo inexistente devuelve 404 DIARY_TARGET_INVALID", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.resolveDiaryTarget.mockRejectedValue(
      new ApiError("DIARY_TARGET_INVALID", 404, "El objetivo de la escucha no existe"),
    );
    const response = await POST(
      new NextRequest("http://localhost/api/me/diary", {
        method: "POST",
        body: JSON.stringify({ target: { type: "artist", id: targetId } }),
      }),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "DIARY_TARGET_INVALID" });
  });
});