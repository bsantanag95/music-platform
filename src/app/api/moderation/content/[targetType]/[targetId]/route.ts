import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ModerationActionRequestSchema, ModerationTargetTypeSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { requirePermission } from "@/services/auth/authorization";
import {
  hideComment,
  hideList,
  hideReview,
  restoreComment,
  restoreList,
  restoreReview,
} from "@/services/moderation";

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ targetType: string; targetId: string }> },
) => {
  const parsed = ModerationActionRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "La acción no es válida");
  const { targetType, targetId } = await params;
  const targetTypeParsed = ModerationTargetTypeSchema.safeParse(targetType);
  if (!targetTypeParsed.success) throw new ApiError("INVALID_TARGET", 400, "El objetivo no es válido");
  if (!isValidUuid(targetId)) throw new ApiError("INVALID_TARGET", 400, "El objetivo no es válido");
  const actor = await requirePermission("moderation.review_content");
  const action = parsed.data.action === "hide" ? "hide" : "restore";

  if (targetTypeParsed.data === "comment") {
    if (action === "hide") await hideComment(actor.id, targetId, parsed.data.reason);
    else await restoreComment(actor.id, targetId, parsed.data.reason);
  } else if (targetTypeParsed.data === "review") {
    if (action === "hide") await hideReview(actor.id, targetId, parsed.data.reason);
    else await restoreReview(actor.id, targetId, parsed.data.reason);
  } else {
    if (action === "hide") await hideList(actor.id, targetId, parsed.data.reason);
    else await restoreList(actor.id, targetId, parsed.data.reason);
  }

  return NextResponse.json({ ok: true });
});
