import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { isValidUuid } from "@/lib/validation";
import { ApiError } from "@/lib/api/errors";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { highlightRating, unhighlightRating } from "@/services/rating-highlights/rating-highlights";

// PUT destaca una valoración propia (spec `rating-highlights`, "Fijar una
// valoración como destacada") — se vuelve visible para cualquier visitante
// del perfil, sin importar la relación de seguimiento. Idempotente.
export const PUT = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ ratingId: string }> }) => {
    const { ratingId } = await context.params;
    if (!isValidUuid(ratingId)) throw new ApiError("RATING_NOT_FOUND", 404, "La valoración no existe");
    const user = await requireUser();
    await requireSocialActivityAllowed(user.id);
    return NextResponse.json({ highlights: await highlightRating(user.id, ratingId) });
  },
);

// DELETE quita el destacado. Idempotente.
export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ ratingId: string }> }) => {
    const { ratingId } = await context.params;
    if (!isValidUuid(ratingId)) throw new ApiError("RATING_NOT_FOUND", 404, "La valoración no existe");
    const user = await requireUser();
    return NextResponse.json({ highlights: await unhighlightRating(user.id, ratingId) });
  },
);
