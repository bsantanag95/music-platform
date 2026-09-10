import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listPopularLists: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/services/lists/community", () => ({ listPopularLists: mocks.listPopularLists }));

describe("GET /api/lists/popular", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sin sesión responde 200 con readerId nulo", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.listPopularLists.mockResolvedValue({ lists: [], page: 1, pageSize: 20, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/api/lists/popular"));
    expect(response.status).toBe(200);
    expect(mocks.listPopularLists).toHaveBeenCalledWith(null, 1, 20);
  });

  it("con sesión pasa el id del lector", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u1" });
    mocks.listPopularLists.mockResolvedValue({ lists: [], page: 3, pageSize: 20, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/api/lists/popular?page=3"));
    expect(response.status).toBe(200);
    expect(mocks.listPopularLists).toHaveBeenCalledWith("u1", 3, 20);
  });

  it("paginación inválida responde 400", async () => {
    const response = await GET(new NextRequest("http://localhost/api/lists/popular?page=0"));
    expect(response.status).toBe(400);
    expect(mocks.listPopularLists).not.toHaveBeenCalled();
  });
});
