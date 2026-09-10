import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ModerationReportStatusSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { requirePermission } from "@/services/auth/authorization";
import { updateReportStatus } from "@/services/moderation";

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) => {
  const parsed = ModerationReportStatusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El estado no es válido");
  const { reportId } = await params;
  if (!isValidUuid(reportId)) throw new ApiError("VALIDATION_ERROR", 400, "El identificador no es válido");
  const user = await requirePermission("moderation.review_content");
  await updateReportStatus(user.id, reportId, parsed.data.status);
  return NextResponse.json({ ok: true });
});
