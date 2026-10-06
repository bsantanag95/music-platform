import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { likeComment, unlikeComment } from "@/services/social/comment-likes";

type Context = { params: Promise<{ commentId: string }> };

async function validId(context: Context) {
  const { commentId } = await context.params;
  if (!z.uuid().safeParse(commentId).success) throw new ApiError("INVALID_COMMENT", 400, "El comentario no es válido");
  return commentId;
}

// Dar like es actividad social (suspensión y bloqueos); quitarlo no.
export const PUT = withErrorHandling(async (_request: NextRequest, context: Context) => {
  const commentId = await validId(context);
  const user = await requireUser();
  await requireSocialActivityAllowed(user.id);
  return NextResponse.json(await likeComment(commentId, user.id));
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: Context) => {
  const commentId = await validId(context);
  const user = await requireUser();
  return NextResponse.json(await unlikeComment(commentId, user.id));
});
