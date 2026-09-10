import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { requirePermission } from "@/services/auth/authorization";
import { revokeSocialSuspension } from "@/services/moderation";

export const DELETE = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: Promise<{ restrictionId: string }> },
) => {
  const { restrictionId } = await params;
  if (!isValidUuid(restrictionId)) throw new ApiError("VALIDATION_ERROR", 400, "El identificador no es válido");
  const actor = await requirePermission("moderation.suspend_social");
  await revokeSocialSuspension(actor.id, restrictionId);
  return NextResponse.json({ ok: true });
});
