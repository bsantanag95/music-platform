import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  listUserDiary: vi.fn(),
  resolveSession: vi.fn(),
}));

vi.mock("@/services/diary/diary", () => ({ listUserDiary: mocks.listUserDiary }));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));

const entry = {
  id: "00000000-0000-4000-8000-000000000003",
  listenContext: "first_listen",
  body: null,
  reaction: null,
  audience: "public",
  createdAt: "2026-01-01T00:00:00.000Z",
  target: { type: "artist", id: "00000000-0000-4000-8000-000000000001", title: "Pink Floyd", subtitle: null, coverThumbUrl: null },
};

describe("diario de usuario (GET /api/users/[username]/diary)", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["page", "NaN"],
    ["page", "0"],
    ["pageSize", "0"],
    ["pageSize", "101"],
  ])("rechaza %s=%s con VALIDATION_ERROR", async (parameter, value) => {
    const request = new NextRequest(`http://localhost/api/users/testuser/diary?${parameter}=${value}`);
    const response = await GET(request, { params: Promise.resolve({ username: "testuser" }) });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listUserDiary).not.toHaveBeenCalled();
  });

  it("lista el diario de otro usuario con sesión", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer-id" } });
    mocks.listUserDiary.mockResolvedValue({ entries: [entry], page: 1, pageSize: 20, hasNext: false });

    const request = new NextRequest("http://localhost/api/users/testuser/diary");
    const response = await GET(request, { params: Promise.resolve({ username: "testuser" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ entries: [entry] });
    expect(mocks.listUserDiary).toHaveBeenCalledWith("testuser", "viewer-id", 1, 20);
  });

  it("lista el diario de otro usuario sin sesión (anónimo)", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listUserDiary.mockResolvedValue({ entries: [entry], page: 1, pageSize: 20, hasNext: false });

    const request = new NextRequest("http://localhost/api/users/testuser/diary");
    const response = await GET(request, { params: Promise.resolve({ username: "testuser" }) });

    expect(response.status).toBe(200);
    expect(mocks.listUserDiary).toHaveBeenCalledWith("testuser", null, 1, 20);
  });

  it("devuelve lista vacía sin permiso (200 con entries vacío)", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listUserDiary.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });

    const request = new NextRequest("http://localhost/api/users/private/diary");
    const response = await GET(request, { params: Promise.resolve({ username: "private" }) });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ entries: [] });
  });
});
