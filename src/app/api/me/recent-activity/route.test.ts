import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  listMyRecentActivity: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/services/home/home", () => ({ listMyRecentActivity: mocks.listMyRecentActivity }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const listenEntry = {
  kind: "listen",
  id: "00000000-0000-4000-8000-000000000003",
  listenContext: "first_listen",
  body: null,
  reaction: "loved",
  audience: "public",
  createdAt: "2026-01-01T00:00:00.000Z",
  target: { type: "artist", id: "00000000-0000-4000-8000-000000000001", title: "Pink Floyd", subtitle: null, artistName: null, coverThumbUrl: null },
  author: { id: user.id, username: "yo", displayName: "Yo" },
};

describe("rastro reciente API (GET /api/me/recent-activity)", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["page", "NaN"],
    ["page", "0"],
    ["pageSize", "0"],
    ["pageSize", "101"],
  ])("rechaza %s=%s con VALIDATION_ERROR", async (parameter, value) => {
    const request = new NextRequest(`http://localhost/api/me/recent-activity?${parameter}=${value}`);
    const response = await GET(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listMyRecentActivity).not.toHaveBeenCalled();
  });

  it("devuelve el rastro propio paginado", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyRecentActivity.mockResolvedValue({ entries: [listenEntry], page: 1, pageSize: 10, hasNext: true });

    const response = await GET(new NextRequest("http://localhost/api/me/recent-activity"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ entries: [listenEntry], hasNext: true });
    expect(mocks.listMyRecentActivity).toHaveBeenCalledWith(user.id, 1, 20);
  });

  it("pasa page y pageSize del query string", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyRecentActivity.mockResolvedValue({ entries: [], page: 2, pageSize: 10, hasNext: false });

    await GET(new NextRequest("http://localhost/api/me/recent-activity?page=2&pageSize=10"));

    expect(mocks.listMyRecentActivity).toHaveBeenCalledWith(user.id, 2, 10);
  });

  it("devuelve 401 AUTH_REQUIRED sin sesión", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await GET(new NextRequest("http://localhost/api/me/recent-activity"));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });
});
