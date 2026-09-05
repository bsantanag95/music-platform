import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listDiscoverLists: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/lists/discovery", () => ({ listDiscoverLists: mocks.listDiscoverLists }));

const user = { id: "00000000-0000-4000-8000-000000000001" };

describe("GET /api/lists/discover", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve las listas públicas paginadas", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listDiscoverLists.mockResolvedValue({ lists: [], page: 2, pageSize: 20, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/api/lists/discover?page=2"));
    expect(response.status).toBe(200);
    expect(mocks.listDiscoverLists).toHaveBeenCalledWith(user.id, 2, 20);
  });

  it("paginación inválida responde 400", async () => {
    const response = await GET(new NextRequest("http://localhost/api/lists/discover?page=0"));
    expect(response.status).toBe(400);
    expect(mocks.listDiscoverLists).not.toHaveBeenCalled();
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await GET(new NextRequest("http://localhost/api/lists/discover"));
    expect(response.status).toBe(401);
  });
});
