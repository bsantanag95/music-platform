import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { CommentRequestSchema } from "@/lib/api/schemas";
import { getCurrentUser, requireUser } from "@/services/auth/authorization";
import { deleteComment, getRootComment, updateComment } from "@/services/social";
import { z } from "zod";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) throw new ApiError("INVALID_COMMENT", 400, "El comentario no es válido");
}

// Una raíz visible (add-notifications-core): pública, con sesión opcional solo para `likedByMe`, como el
// hilo. La usa el enlace de una notificación de respuesta para abrir el hilo en la página del artista.
export const GET = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ commentId: string }> }) => {
  const { commentId } = await context.params;
  validId(commentId);
  const viewer = await getCurrentUser();
  return NextResponse.json({ comment: await getRootComment(commentId, viewer?.id ?? null) });
});

export const PATCH = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ commentId: string }> }) => {
  const { commentId } = await context.params;
  validId(commentId);
  const parsed = CommentRequestSchema.shape.body.safeParse((await request.json().catch(() => null))?.body);
  if (!parsed.success) throw new ApiError("INVALID_COMMENT", 400, "El comentario no es válido");
  const result = await updateComment(commentId, (await requireUser()).id, parsed.data);
  return NextResponse.json({ comment: result });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, context: { params: Promise<{ commentId: string }> }) => {
  const { commentId } = await context.params;
  validId(commentId);
  await deleteComment(commentId, (await requireUser()).id);
  return new NextResponse(null, { status: 204 });
});
