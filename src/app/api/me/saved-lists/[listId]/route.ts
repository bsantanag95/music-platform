import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { SetListTrackingRequestSchema } from "@/lib/api/schemas";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { setListTracking, unsaveList } from "@/services/lists/saved-lists";

function validId(listId: string) {
  if (!z.uuid().safeParse(listId).success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El identificador de lista no es válido");
  }
}

export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ listId: string }> }) => {
    const { listId } = await context.params;
    validId(listId);
    await unsaveList((await requireUser()).id, listId);
    return new NextResponse(null, { status: 204 });
  },
);

// Activa/desactiva el tracking de progreso propio sobre una lista ajena de
// álbumes (openspec: add-camino), sin alterar `following` (Decisión D3 de su
// design.md). Crea el guardado si todavía no existía.
export const PATCH = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ listId: string }> }) => {
    const { listId } = await context.params;
    validId(listId);
    const body: unknown = await request.json().catch(() => null);
    const parsed = SetListTrackingRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "El tracking no es válido");
    }
    const user = await requireUser();
    await requireSocialActivityAllowed(user.id);
    const list = await setListTracking(user.id, listId, parsed.data.tracking);
    return NextResponse.json({ list });
  },
);
