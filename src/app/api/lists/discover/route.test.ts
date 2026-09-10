import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listDiscoverLists: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/services/lists/discovery", () => ({ listDiscoverLists: mocks.listDiscoverLists }));

const user = { id: "00000000-0000-4000-8000-000000000001" };

describe("GET /api/lists/discover", () => {
  beforeEach(() => vi.clearAllMocks());

  it("con sesión pasa el id del lector", async () => {
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.listDiscoverLists.mockResolvedValue({ lists: [], page: 2, pageSize: 20, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/api/lists/discover?page=2"));
    expect(response.status).toBe(200);
    expect(mocks.listDiscoverLists).toHaveBeenCalledWith(user.id, 2, 20);
  });

  it("sin sesión devuelve resultados con readerId nulo", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.listDiscoverLists.mockResolvedValue({ lists: [], page: 1, pageSize: 20, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/api/lists/discover"));
    expect(response.status).toBe(200);
    expect(mocks.listDiscoverLists).toHaveBeenCalledWith(null, 1, 20);
  });

  it("paginación inválida responde 400", async () => {
    const response = await GET(new NextRequest("http://localhost/api/lists/discover?page=0"));
    expect(response.status).toBe(400);
    expect(mocks.listDiscoverLists).not.toHaveBeenCalled();
  });
});
