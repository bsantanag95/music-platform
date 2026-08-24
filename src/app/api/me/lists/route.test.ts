import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createList: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/lists/lists", () => ({ createList: mocks.createList }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const list = {
  id: "00000000-0000-4000-8000-000000000003",
  entityType: "artist",
  title: "Favoritos de los 80",
  description: null,
  audience: "followers",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  items: [],
};

describe("lists API (POST /api/me/lists)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crea una lista con 201", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.createList.mockResolvedValue(list);
    const response = await POST(
      new NextRequest("http://localhost/api/me/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityType: "artist", title: "Favoritos de los 80", audience: "followers" }),
      }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ list });
    expect(mocks.createList).toHaveBeenCalledWith({
      ownerId: user.id,
      entityType: "artist",
      title: "Favoritos de los 80",
      description: null,
      audience: "followers",
    });
  });

  it("rechaza un body inválido con VALIDATION_ERROR", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/me/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityType: "album", title: "" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.createList).not.toHaveBeenCalled();
  });

  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const response = await POST(
      new NextRequest("http://localhost/api/me/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityType: "artist", title: "ok" }),
      }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });
});