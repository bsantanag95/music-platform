import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, DELETE } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getOwnedCamino: vi.fn(),
  deleteCamino: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/camino/camino", () => ({
  getOwnedCamino: mocks.getOwnedCamino,
  deleteCamino: mocks.deleteCamino,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const caminoId = "00000000-0000-4000-8000-000000000002";
const camino = { id: caminoId, title: "Shoegaze esencial" };
const ctx = (id = caminoId) => ({ params: Promise.resolve({ caminoId: id }) });

describe("GET /api/me/caminos/[caminoId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve el detalle propio", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.getOwnedCamino.mockResolvedValue(camino);
    const response = await GET(new NextRequest("http://localhost/x"), ctx());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ camino });
  });

  it("id inválido responde CAMINO_NOT_FOUND sin llamar al servicio", async () => {
    const response = await GET(new NextRequest("http://localhost/x"), ctx("no-es-uuid"));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "CAMINO_NOT_FOUND" });
    expect(mocks.getOwnedCamino).not.toHaveBeenCalled();
  });

  it("Camino ajeno o inexistente propaga CAMINO_NOT_FOUND", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.getOwnedCamino.mockRejectedValue(new ApiError("CAMINO_NOT_FOUND", 404, "No existe"));
    const response = await GET(new NextRequest("http://localhost/x"), ctx());
    expect(response.status).toBe(404);
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await GET(new NextRequest("http://localhost/x"), ctx());
    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/me/caminos/[caminoId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("borra el Camino propio y responde 204", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.deleteCamino.mockResolvedValue(undefined);
    const response = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), ctx());
    expect(response.status).toBe(204);
    expect(mocks.deleteCamino).toHaveBeenCalledWith(caminoId, user.id);
  });

  it("Camino ajeno responde CAMINO_NOT_FOUND y no borra nada", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.deleteCamino.mockRejectedValue(new ApiError("CAMINO_NOT_FOUND", 404, "No existe"));
    const response = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), ctx());
    expect(response.status).toBe(404);
  });
});
