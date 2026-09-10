import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ReportContentRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { reportContent } from "@/services/moderation";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const parsed = ReportContentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El reporte no es válido");
  const user = await requireUser();
  const target = parsed.data.targetType === "comment"
    ? { commentId: parsed.data.targetId }
    : { reviewId: parsed.data.targetId };
  const report = await reportContent(user.id, target, parsed.data.reason);
  return NextResponse.json({ report }, { status: report ? 201 : 200 });
});
