import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "@/services/auth/authorization";
import { deleteCamino, getOwnedCamino } from "@/services/camino/camino";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("CAMINO_NOT_FOUND", 404, "El Camino no existe");
  }
}

export const GET = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ caminoId: string }> }) => {
    const { caminoId } = await context.params;
    validId(caminoId);
    const camino = await getOwnedCamino(caminoId, (await requireUser()).id);
    return NextResponse.json({ camino });
  },
);

// Borrado físico e irreversible del Camino propio.
export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ caminoId: string }> }) => {
    const { caminoId } = await context.params;
    validId(caminoId);
    await deleteCamino(caminoId, (await requireUser()).id);
    return new NextResponse(null, { status: 204 });
  },
);
