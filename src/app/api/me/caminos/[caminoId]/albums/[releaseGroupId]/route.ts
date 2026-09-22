import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "@/services/auth/authorization";
import { removeAlbumFromCamino } from "@/services/camino/camino";

function validId(id: string, code: "CAMINO_NOT_FOUND" | "ALBUM_NOT_FOUND" = "CAMINO_NOT_FOUND") {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError(code, 404, "El recurso no existe");
  }
}

// Quita un álbum del Camino propio. Idempotente: no falla si ya no estaba.
export const DELETE = withErrorHandling(
  async (
    _request: NextRequest,
    context: { params: Promise<{ caminoId: string; releaseGroupId: string }> },
  ) => {
    const { caminoId, releaseGroupId } = await context.params;
    validId(caminoId);
    validId(releaseGroupId, "ALBUM_NOT_FOUND");
    const camino = await removeAlbumFromCamino(caminoId, (await requireUser()).id, releaseGroupId);
    return NextResponse.json({ camino });
  },
);
