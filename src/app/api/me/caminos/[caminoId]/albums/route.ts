import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { AddCaminoAlbumRequestSchema } from "@/lib/api/schemas";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { addAlbumToCamino } from "@/services/camino/camino";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("CAMINO_NOT_FOUND", 404, "El Camino no existe");
  }
}

// Agrega un álbum al final del Camino propio. Idempotente: no duplica.
export const POST = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ caminoId: string }> }) => {
    const { caminoId } = await context.params;
    validId(caminoId);
    const body: unknown = await request.json().catch(() => null);
    const parsed = AddCaminoAlbumRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "El álbum no es válido");
    }
    const user = await requireUser();
    await requireSocialActivityAllowed(user.id);
    const camino = await addAlbumToCamino(caminoId, user.id, parsed.data.releaseGroupId);
    return NextResponse.json({ camino }, { status: 201 });
  },
);
