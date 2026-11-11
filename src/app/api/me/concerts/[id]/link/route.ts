import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ConcertLinkRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { linkEntryToConcert, unlinkEntry } from "@/services/concerts/suggestions";

// Enlazar y desvincular un recuerdo propio (openspec: add-shared-concerts-phase3, capability `concert-log`). `POST` enlaza
// una sugerencia válida sin tocar lo escrito; `DELETE` quita el enlace y conserva el recuerdo. Un id ajeno, inexistente
// o mal formado responde `CONCERT_NOT_FOUND`.

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) throw new ApiError("CONCERT_NOT_FOUND", 404, "El concierto no existe");
}

export const POST = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  validId(id);
  const parsed = ConcertLinkRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El concierto no es válido");
  const user = await requireUser();
  return NextResponse.json({ entry: await linkEntryToConcert(user.id, id, parsed.data.concertId) });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  validId(id);
  const user = await requireUser();
  return NextResponse.json({ entry: await unlinkEntry(user.id, id) });
});
