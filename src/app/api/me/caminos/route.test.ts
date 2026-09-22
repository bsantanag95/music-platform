import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireSocialActivityAllowed: vi.fn(async () => undefined),
  listMyCaminos: vi.fn(),
  createCamino: vi.fn(),
  listTrackedLists: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({
  requireUser: mocks.requireUser,
  requireSocialActivityAllowed: mocks.requireSocialActivityAllowed,
}));
vi.mock("@/services/camino/camino", () => ({
  listMyCaminos: mocks.listMyCaminos,
  createCamino: mocks.createCamino,
}));
vi.mock("@/services/lists/saved-lists", () => ({ listTrackedLists: mocks.listTrackedLists }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const camino = { id: "00000000-0000-4000-8000-000000000002", title: "Shoegaze esencial" };

describe("GET /api/me/caminos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("combina Caminos propios y listas ajenas trackeadas", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyCaminos.mockResolvedValue([camino]);
    mocks.listTrackedLists.mockResolvedValue([{ id: "list-1" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ caminos: [camino], trackedLists: [{ id: "list-1" }] });
    expect(mocks.listMyCaminos).toHaveBeenCalledWith(user.id);
    expect(mocks.listTrackedLists).toHaveBeenCalledWith(user.id);
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await GET();
    expect(response.status).toBe(401);
  });
});

describe("POST /api/me/caminos", () => {
  beforeEach(() => vi.clearAllMocks());

  function req(body: unknown) {
    return new NextRequest("http://localhost/x", { method: "POST", body: JSON.stringify(body) });
  }

  it("crea el Camino y responde 201", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.createCamino.mockResolvedValue(camino);

    const response = await POST(req({ title: "Shoegaze esencial" }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ camino });
    expect(mocks.createCamino).toHaveBeenCalledWith(user.id, {
      title: "Shoegaze esencial",
      description: null,
      audience: undefined,
    });
  });

  it("título vacío responde 400 sin crear nada", async () => {
    mocks.requireUser.mockResolvedValue(user);
    const response = await POST(req({ title: "" }));
    expect(response.status).toBe(400);
    expect(mocks.createCamino).not.toHaveBeenCalled();
  });

  it("audiencia no privada exige actividad social habilitada", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.requireSocialActivityAllowed.mockRejectedValueOnce(
      new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "Suspendido"),
    );
    const response = await POST(req({ title: "Shoegaze esencial", audience: "public" }));
    expect(response.status).toBe(403);
    expect(mocks.createCamino).not.toHaveBeenCalled();
  });
});
