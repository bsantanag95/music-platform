import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listCommunityActivity: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/services/activity/community-activity", () => ({
  listCommunityActivity: mocks.listCommunityActivity,
}));

describe("GET /api/activity/recent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sin sesión responde 200 con readerId nulo", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.listCommunityActivity.mockResolvedValue({ entries: [], page: 1, pageSize: 10, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/api/activity/recent"));
    expect(response.status).toBe(200);
    expect(mocks.listCommunityActivity).toHaveBeenCalledWith(null, 1, 10);
  });

  it("con sesión pasa el id del lector", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1" });
    mocks.listCommunityActivity.mockResolvedValue({ entries: [], page: 2, pageSize: 10, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/api/activity/recent?page=2"));
    expect(response.status).toBe(200);
    expect(mocks.listCommunityActivity).toHaveBeenCalledWith("u1", 2, 10);
  });

  it("paginación inválida responde 400", async () => {
    const response = await GET(new NextRequest("http://localhost/api/activity/recent?page=0"));
    expect(response.status).toBe(400);
    expect(mocks.listCommunityActivity).not.toHaveBeenCalled();
  });
});
