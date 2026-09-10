import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ModerationReportQuerySchema, ReportContentRequestSchema } from "@/lib/api/schemas";
import { requirePermission, requireUser } from "@/services/auth/authorization";
import { reportContent } from "@/services/moderation";
import { listModerationReports } from "@/services/moderation-queries";

export const GET = withErrorHandling(async (request: NextRequest) => {
  await requirePermission("moderation.review_content");
  const parsed = ModerationReportQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "Los filtros no son válidos");
  return NextResponse.json(await listModerationReports(parsed.data));
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const parsed = ReportContentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El reporte no es válido");
  const user = await requireUser();
  const target = parsed.data.targetType === "comment"
    ? { commentId: parsed.data.targetId }
    : parsed.data.targetType === "review"
      ? { reviewId: parsed.data.targetId }
      : { userId: parsed.data.targetId };
  const report = await reportContent(user.id, target, parsed.data.reason);
  return NextResponse.json({ report }, { status: report ? 201 : 200 });
});
