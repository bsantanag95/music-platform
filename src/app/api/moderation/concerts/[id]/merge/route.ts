import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { MergeConcertRequestSchema } from "@/lib/api/schemas";
import { requirePermission } from "@/services/auth/authorization";
import { mergeConcert } from "@/services/concerts/community";

// Fusionar un concierto duplicado en otro (openspec: add-shared-concerts-phase2, capability `content-moderation`). Solo
// con permiso de moderación; auditado y resuelve los reportes abiertos del origen.

export const POST = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError("SHARED_CONCERT_NOT_FOUND", 404, "El concierto no existe");
  const parsed = MergeConcertRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La fusión no es válida");
  const actor = await requirePermission("moderation.review_content");
  return NextResponse.json({ ok: true, ...(await mergeConcert(actor.id, id, parsed.data.targetId, parsed.data.reason)) });
});
