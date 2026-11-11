import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ConcertLinkRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { dismissLinkSuggestion } from "@/services/concerts/suggestions";

// "No es este" (openspec: add-shared-concerts-phase3): descarta un concierto como sugerencia de enlace para un recuerdo
// propio. Idempotente.

export const POST = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError("CONCERT_NOT_FOUND", 404, "El concierto no existe");
  const parsed = ConcertLinkRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El concierto no es válido");
  const user = await requireUser();
  await dismissLinkSuggestion(user.id, id, parsed.data.concertId);
  return new NextResponse(null, { status: 204 });
});
