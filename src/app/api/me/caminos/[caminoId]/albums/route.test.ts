import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireSocialActivityAllowed: vi.fn(async () => undefined),
  addAlbumToCamino: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({
  requireUser: mocks.requireUser,
  requireSocialActivityAllowed: mocks.requireSocialActivityAllowed,
}));
vi.mock("@/services/camino/camino", () => ({ addAlbumToCamino: mocks.addAlbumToCamino }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const caminoId = "00000000-0000-4000-8000-000000000002";
const releaseGroupId = "00000000-0000-4000-8000-000000000003";
const camino = { id: caminoId };
const ctx = () => ({ params: Promise.resolve({ caminoId }) });

function req(body: unknown) {
  return new NextRequest("http://localhost/x", { method: "POST", body: JSON.stringify(body) });
}

describe("POST /api/me/caminos/[caminoId]/albums", () => {
  beforeEach(() => vi.clearAllMocks());

  it("agrega el álbum y responde 201", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.addAlbumToCamino.mockResolvedValue(camino);
    const response = await POST(req({ releaseGroupId }), ctx());
    expect(response.status).toBe(201);
    expect(mocks.addAlbumToCamino).toHaveBeenCalledWith(caminoId, user.id, releaseGroupId);
  });

  it("cuerpo inválido responde 400 sin llamar al servicio", async () => {
    mocks.requireUser.mockResolvedValue(user);
    const response = await POST(req({ releaseGroupId: "no-es-uuid" }), ctx());
    expect(response.status).toBe(400);
    expect(mocks.addAlbumToCamino).not.toHaveBeenCalled();
  });

  it("álbum inexistente propaga LIST_TARGET_INVALID", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.addAlbumToCamino.mockRejectedValue(
      new ApiError("LIST_TARGET_INVALID", 404, "No existe"),
    );
    const response = await POST(req({ releaseGroupId }), ctx());
    expect(response.status).toBe(404);
  });
});
