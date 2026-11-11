import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ReportConcertRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { reportConcert } from "@/services/concerts/community";

// Reportar un concierto compartido (openspec: add-shared-concerts-phase2, capability `content-moderation`): motivo
// cerrado y un texto opcional. Un reporte abierto por persona y concierto: repetirlo responde 200 sin crear otro.

export const POST = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError("SHARED_CONCERT_NOT_FOUND", 404, "El concierto no existe");
  const parsed = ReportConcertRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El reporte no es válido");
  const user = await requireUser();
  const report = await reportConcert(user.id, id, parsed.data.reason, parsed.data.details ?? null);
  return NextResponse.json({ report }, { status: report ? 201 : 200 });
});
