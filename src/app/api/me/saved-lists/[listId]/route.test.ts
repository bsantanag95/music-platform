import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  unsaveList: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/lists/saved-lists", () => ({ unsaveList: mocks.unsaveList }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const listId = "00000000-0000-4000-8000-000000000003";
const params = (id: string) => ({ params: Promise.resolve({ listId: id }) });

describe("DELETE /api/me/saved-lists/[listId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("quita el guardado y responde 204 (idempotente)", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.unsaveList.mockResolvedValue(undefined);
    const response = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), params(listId));
    expect(response.status).toBe(204);
    expect(mocks.unsaveList).toHaveBeenCalledWith(user.id, listId);
  });

  it("id no-uuid responde 400", async () => {
    const response = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), params("nope"));
    expect(response.status).toBe(400);
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), params(listId));
    expect(response.status).toBe(401);
  });
});
