import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { RatingMutationSchema, SocialTargetTypeSchema } from "@/lib/api/schemas";
import { requireUser, getCurrentUser } from "@/services/auth/authorization";
import { deleteRating, getRatings, resolveSocialTarget, upsertRating } from "@/services/social";
import { z } from "zod";

async function target(params: Promise<{ target: string; id: string }>) {
  const { target: rawTarget, id } = await params;
  const targetType = SocialTargetTypeSchema.safeParse(rawTarget);
  if (!targetType.success || !z.uuid().safeParse(id).success) throw new ApiError("INVALID_TARGET", 400, "El objetivo no es válido");
  return resolveSocialTarget(targetType.data, id);
}

export const GET = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ target: string; id: string }> }) => {
  const resolved = await target(context.params);
  return NextResponse.json(await getRatings(resolved, (await getCurrentUser())?.id));
});

export const PUT = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ target: string; id: string }> }) => {
  const resolved = await target(context.params);
  const user = await requireUser();
  const parsed = RatingMutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("INVALID_RATING", 400, "El rating no es válido");
  return NextResponse.json({ rating: await upsertRating(resolved, user.id, parsed.data.stars, parsed.data.detailedScore) });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ target: string; id: string }> }) => {
  const resolved = await target(context.params);
  await deleteRating(resolved, (await requireUser()).id);
  return new NextResponse(null, { status: 204 });
});
