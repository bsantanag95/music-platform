import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST, DELETE } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireSocialActivityAllowed: vi.fn(async () => undefined),
  archiveCamino: vi.fn(),
  unarchiveCamino: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({
  requireUser: mocks.requireUser,
  requireSocialActivityAllowed: mocks.requireSocialActivityAllowed,
}));
vi.mock("@/services/camino/camino", () => ({
  archiveCamino: mocks.archiveCamino,
  unarchiveCamino: mocks.unarchiveCamino,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const caminoId = "00000000-0000-4000-8000-000000000002";
const camino = { id: caminoId, state: "archived" };
const ctx = () => ({ params: Promise.resolve({ caminoId }) });

describe("POST /api/me/caminos/[caminoId]/archive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("archiva y devuelve el detalle actualizado", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.archiveCamino.mockResolvedValue(camino);
    const response = await POST(new NextRequest("http://localhost/x", { method: "POST" }), ctx());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ camino });
    expect(mocks.archiveCamino).toHaveBeenCalledWith(caminoId, user.id);
  });

  it("Camino ajeno propaga CAMINO_NOT_FOUND", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.archiveCamino.mockRejectedValue(new ApiError("CAMINO_NOT_FOUND", 404, "No existe"));
    const response = await POST(new NextRequest("http://localhost/x", { method: "POST" }), ctx());
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/me/caminos/[caminoId]/archive", () => {
  beforeEach(() => vi.clearAllMocks());

  it("desarchiva y devuelve el detalle actualizado", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.unarchiveCamino.mockResolvedValue({ ...camino, state: "in_progress" });
    const response = await DELETE(
      new NextRequest("http://localhost/x", { method: "DELETE" }),
      ctx(),
    );
    expect(response.status).toBe(200);
    expect(mocks.unarchiveCamino).toHaveBeenCalledWith(caminoId, user.id);
  });
});
