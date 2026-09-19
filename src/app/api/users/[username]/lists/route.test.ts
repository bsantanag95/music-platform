import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  listUserLists: vi.fn(),
}));

vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/lists/lists", () => ({ listUserLists: mocks.listUserLists }));

const result = { lists: [], page: 1, pageSize: 20, hasNext: false, totalCount: 0 };
const params = { params: Promise.resolve({ username: "ana" }) };

describe("GET /api/users/[username]/lists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el listado con el total, con sesión opcional", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listUserLists.mockResolvedValue(result);
    const response = await GET(new NextRequest("http://localhost/api/users/ana/lists"), params);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(mocks.listUserLists).toHaveBeenCalledWith("ana", null, 1, 20, {
      q: undefined,
      entityType: undefined,
      sort: undefined,
    });
  });

  it("parsea q/entityType/sort y los reenvía junto con el lector", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    mocks.listUserLists.mockResolvedValue(result);
    await GET(
      new NextRequest(
        "http://localhost/api/users/ana/lists?page=2&pageSize=10&q=rock&entityType=release-group&sort=alpha",
      ),
      params,
    );
    expect(mocks.listUserLists).toHaveBeenCalledWith("ana", "viewer", 2, 10, {
      q: "rock",
      entityType: "release-group",
      sort: "alpha",
    });
  });

  it("rechaza un filtro inválido con VALIDATION_ERROR", async () => {
    const response = await GET(new NextRequest("http://localhost/api/users/ana/lists?sort=popular"), params);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listUserLists).not.toHaveBeenCalled();
  });

  it("rechaza una paginación inválida con VALIDATION_ERROR", async () => {
    const response = await GET(new NextRequest("http://localhost/api/users/ana/lists?page=0"), params);
    expect(response.status).toBe(400);
    expect(mocks.listUserLists).not.toHaveBeenCalled();
  });
});
