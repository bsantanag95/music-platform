import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { archiveCamino, unarchiveCamino } from "@/services/camino/camino";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("CAMINO_NOT_FOUND", 404, "El Camino no existe");
  }
}

// Archivar: conserva el contenido y el progreso derivado. Reversible con DELETE.
export const POST = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ caminoId: string }> }) => {
    const { caminoId } = await context.params;
    validId(caminoId);
    const user = await requireUser();
    await requireSocialActivityAllowed(user.id);
    const camino = await archiveCamino(caminoId, user.id);
    return NextResponse.json({ camino });
  },
);

export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ caminoId: string }> }) => {
    const { caminoId } = await context.params;
    validId(caminoId);
    const user = await requireUser();
    await requireSocialActivityAllowed(user.id);
    const camino = await unarchiveCamino(caminoId, user.id);
    return NextResponse.json({ camino });
  },
);
