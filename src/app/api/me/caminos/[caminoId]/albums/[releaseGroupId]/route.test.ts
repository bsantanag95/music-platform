import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  removeAlbumFromCamino: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/camino/camino", () => ({ removeAlbumFromCamino: mocks.removeAlbumFromCamino }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const caminoId = "00000000-0000-4000-8000-000000000002";
const releaseGroupId = "00000000-0000-4000-8000-000000000003";
const camino = { id: caminoId };
const ctx = (cId = caminoId, rId = releaseGroupId) => ({
  params: Promise.resolve({ caminoId: cId, releaseGroupId: rId }),
});

describe("DELETE /api/me/caminos/[caminoId]/albums/[releaseGroupId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("quita el álbum y devuelve el detalle actualizado", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.removeAlbumFromCamino.mockResolvedValue(camino);
    const response = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), ctx());
    expect(response.status).toBe(200);
    expect(mocks.removeAlbumFromCamino).toHaveBeenCalledWith(caminoId, user.id, releaseGroupId);
  });

  it("id de Camino inválido responde CAMINO_NOT_FOUND sin llamar al servicio", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost/x", { method: "DELETE" }),
      ctx("no-es-uuid"),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "CAMINO_NOT_FOUND" });
    expect(mocks.removeAlbumFromCamino).not.toHaveBeenCalled();
  });

  it("id de álbum inválido responde ALBUM_NOT_FOUND", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost/x", { method: "DELETE" }),
      ctx(caminoId, "no-es-uuid"),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "ALBUM_NOT_FOUND" });
  });

  it("Camino ajeno propaga CAMINO_NOT_FOUND", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.removeAlbumFromCamino.mockRejectedValue(
      new ApiError("CAMINO_NOT_FOUND", 404, "No existe"),
    );
    const response = await DELETE(new NextRequest("http://localhost/x", { method: "DELETE" }), ctx());
    expect(response.status).toBe(404);
  });
});
