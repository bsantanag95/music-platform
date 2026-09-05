import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, POST } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  pinList: vi.fn(),
  unpinList: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/lists/lists", () => ({ pinList: mocks.pinList, unpinList: mocks.unpinList }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const listId = "00000000-0000-4000-8000-000000000003";
const params = (id: string) => ({ params: Promise.resolve({ listId: id }) });

describe("pin API (/api/me/lists/[listId]/pin)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST fija la lista y responde 204", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.pinList.mockResolvedValue(undefined);
    const response = await POST(new NextRequest(`http://localhost/x`, { method: "POST" }), params(listId));
    expect(response.status).toBe(204);
    expect(mocks.pinList).toHaveBeenCalledWith(listId, user.id);
  });

  it("DELETE desfija la lista y responde 204", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.unpinList.mockResolvedValue(undefined);
    const response = await DELETE(new NextRequest(`http://localhost/x`, { method: "DELETE" }), params(listId));
    expect(response.status).toBe(204);
    expect(mocks.unpinList).toHaveBeenCalledWith(listId, user.id);
  });

  it("id no-uuid responde 404 LIST_NOT_FOUND", async () => {
    const response = await POST(new NextRequest("http://localhost/x", { method: "POST" }), params("nope"));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "LIST_NOT_FOUND" });
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await POST(new NextRequest("http://localhost/x", { method: "POST" }), params(listId));
    expect(response.status).toBe(401);
  });

  it("lista ajena propaga 404 LIST_NOT_FOUND", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.pinList.mockRejectedValue(new ApiError("LIST_NOT_FOUND", 404, "x"));
    const response = await POST(new NextRequest("http://localhost/x", { method: "POST" }), params(listId));
    expect(response.status).toBe(404);
  });
});
