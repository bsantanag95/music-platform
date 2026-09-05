import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  saveList: vi.fn(),
  listSavedLists: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/lists/saved-lists", () => ({
  saveList: mocks.saveList,
  listSavedLists: mocks.listSavedLists,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const listId = "00000000-0000-4000-8000-000000000003";

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/me/saved-lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("saved-lists API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET lista las guardadas del usuario", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listSavedLists.mockResolvedValue({ lists: [], page: 1, pageSize: 20, hasNext: false });
    const response = await GET(new NextRequest("http://localhost/api/me/saved-lists"));
    expect(response.status).toBe(200);
    expect(mocks.listSavedLists).toHaveBeenCalledWith(user.id, 1, 20);
  });

  it("POST guarda una lista con following y responde 201", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.saveList.mockResolvedValue({ id: listId });
    const response = await post({ listId, following: true });
    expect(response.status).toBe(201);
    expect(mocks.saveList).toHaveBeenCalledWith(user.id, listId, true);
  });

  it("POST sin following usa false por defecto", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.saveList.mockResolvedValue({ id: listId });
    await post({ listId });
    expect(mocks.saveList).toHaveBeenCalledWith(user.id, listId, false);
  });

  it("POST con body inválido responde 400", async () => {
    const response = await post({ listId: "no-uuid" });
    expect(response.status).toBe(400);
    expect(mocks.saveList).not.toHaveBeenCalled();
  });

  it("POST propaga LIST_NOT_FOUND del servicio", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.saveList.mockRejectedValue(new ApiError("LIST_NOT_FOUND", 404, "x"));
    const response = await post({ listId });
    expect(response.status).toBe(404);
  });

  it("POST propaga VALIDATION_ERROR (lista propia)", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.saveList.mockRejectedValue(new ApiError("VALIDATION_ERROR", 400, "x"));
    const response = await post({ listId });
    expect(response.status).toBe(400);
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await GET(new NextRequest("http://localhost/api/me/saved-lists"));
    expect(response.status).toBe(401);
  });
});
