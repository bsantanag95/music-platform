import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { CreateSharedConcertRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { ConcertDuplicateError, createCommunityConcert } from "@/services/concerts/community";

// Crear un concierto de la comunidad (openspec: add-shared-concerts-phase2, capability `community-concerts`). Nace por
// confirmar, con quien lo crea como primera asistente. Un duplicado exacto responde `409 CONCERT_DUPLICATE` con el id del
// existente en `concertId`, para sumarse con "Estuve ahí" en vez de crear otro.

export const POST = withErrorHandling(async (request: NextRequest) => {
  const parsed = CreateSharedConcertRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El concierto no es válido");
  const user = await requireUser();
  try {
    return NextResponse.json(await createCommunityConcert(user.id, parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof ConcertDuplicateError) {
      return NextResponse.json({ error: error.message, code: error.code, concertId: error.concertId }, { status: 409 });
    }
    throw error;
  }
});
