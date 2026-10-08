import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { CommentRequestSchema } from "@/lib/api/schemas";
import { getCurrentUser, requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { createReply, listReplies } from "@/services/social";

type Context = { params: Promise<{ commentId: string }> };

const RepliesPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

async function validId(context: Context) {
  const { commentId } = await context.params;
  if (!z.uuid().safeParse(commentId).success) throw new ApiError("INVALID_COMMENT", 400, "El comentario no es válido");
  return commentId;
}

// Hilo de una raíz (add-comment-replies): público, con sesión opcional solo para `likedByMe`.
export const GET = withErrorHandling(async (request: NextRequest, context: Context) => {
  const commentId = await validId(context);
  const search = request.nextUrl.searchParams;
  const pagination = RepliesPaginationSchema.safeParse({ page: search.get("page") ?? undefined, pageSize: search.get("pageSize") ?? undefined });
  if (!pagination.success) throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  const viewer = await getCurrentUser();
  return NextResponse.json(await listReplies(commentId, pagination.data.page, pagination.data.pageSize, viewer?.id ?? null));
});

// Responder es actividad social (sesión y suspensión), como comentar.
export const POST = withErrorHandling(async (request: NextRequest, context: Context) => {
  const commentId = await validId(context);
  const user = await requireUser();
  await requireSocialActivityAllowed(user.id);
  const parsed = CommentRequestSchema.shape.body.safeParse((await request.json().catch(() => null))?.body);
  if (!parsed.success) throw new ApiError("INVALID_COMMENT", 400, "El comentario no es válido");
  return NextResponse.json({ comment: await createReply(commentId, user.id, parsed.data) }, { status: 201 });
});
