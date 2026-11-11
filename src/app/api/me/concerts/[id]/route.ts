import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { UpdateConcertRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { removeConcert, updateConcert } from "@/services/concerts/concerts";

// Editar y quitar un concierto propio (openspec: add-my-concerts). Un id ajeno, inexistente o mal formado responde
// `CONCERT_NOT_FOUND`, sin revelar si existe.

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) throw new ApiError("CONCERT_NOT_FOUND", 404, "El concierto no existe");
}

export const PATCH = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  validId(id);
  const body: unknown = await request.json().catch(() => null);
  const parsed = UpdateConcertRequestSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La modificación del concierto no es válida");
  const user = await requireUser();
  const entry = await updateConcert(id, user.id, parsed.data);
  return NextResponse.json({ entry });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  validId(id);
  const user = await requireUser();
  await removeConcert(id, user.id);
  return new NextResponse(null, { status: 204 });
});
