import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ReviewRequestSchema, SocialTargetTypeSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { createOrReplaceReview, listReviews, resolveSocialTarget } from "@/services/reviews";

const ReviewsPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

async function target(params: Promise<{ target: string; id: string }>) {
  const { target: rawTarget, id } = await params;
  const type = SocialTargetTypeSchema.safeParse(rawTarget);
  if (!type.success || !z.uuid().safeParse(id).success) {
    throw new ApiError("INVALID_TARGET", 400, "El objetivo no es válido");
  }
  return resolveSocialTarget(type.data, id);
}

export const GET = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ target: string; id: string }> }) => {
    const resolved = await target(context.params);
    const search = request.nextUrl.searchParams;
    const pagination = ReviewsPaginationSchema.safeParse({
      page: search.get("page") ?? undefined,
      pageSize: search.get("pageSize") ?? undefined,
    });
    if (!pagination.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
    }
    return NextResponse.json(
      await listReviews(resolved, pagination.data.page, pagination.data.pageSize),
    );
  },
);

export const POST = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ target: string; id: string }> }) => {
    const resolved = await target(context.params);
    const user = await requireUser();
    const parsed = ReviewRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "La reseña no es válida");
    }
    return NextResponse.json(
      { review: await createOrReplaceReview(resolved, user.id, parsed.data) },
      { status: 201 },
    );
  },
);
