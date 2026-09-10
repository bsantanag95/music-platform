import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listsFromFollowing: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/lists/community", () => ({ listsFromFollowing: mocks.listsFromFollowing }));

describe("GET /api/lists/from-following", () => {
  beforeEach(() => vi.clearAllMocks());

  it("con sesión devuelve las listas", async () => {
    mocks.requireUser.mockResolvedValue({ id: "u1" });
    mocks.listsFromFollowing.mockResolvedValue({ lists: [], page: 1, pageSize: 20, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/api/lists/from-following"));
    expect(response.status).toBe(200);
    expect(mocks.listsFromFollowing).toHaveBeenCalledWith("u1", 1, 20);
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await GET(new NextRequest("http://localhost/api/lists/from-following"));
    expect(response.status).toBe(401);
  });

  it("paginación inválida responde 400", async () => {
    const response = await GET(new NextRequest("http://localhost/api/lists/from-following?pageSize=0"));
    expect(response.status).toBe(400);
    expect(mocks.listsFromFollowing).not.toHaveBeenCalled();
  });
});
