import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ReviewUpdateSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { deleteReview, updateReview } from "@/services/reviews";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("REVIEW_NOT_FOUND", 404, "Reseña no encontrada");
  }
}

export const PATCH = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ reviewId: string }> }) => {
    const { reviewId } = await context.params;
    validId(reviewId);
    const parsed = ReviewUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "La reseña no es válida");
    }
    const review = await updateReview(reviewId, (await requireUser()).id, parsed.data);
    return NextResponse.json({ review });
  },
);

export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ reviewId: string }> }) => {
    const { reviewId } = await context.params;
    validId(reviewId);
    await deleteReview(reviewId, (await requireUser()).id);
    return new NextResponse(null, { status: 204 });
  },
);
