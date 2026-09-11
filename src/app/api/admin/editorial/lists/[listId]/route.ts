import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { UpdateEditorialDraftRequestSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { requirePermission } from "@/services/auth/authorization";
import { deleteEditorialDraft, updateEditorialDraft } from "@/services/lists/editorial";

export const PATCH = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) => {
  const { listId } = await params;
  if (!isValidUuid(listId)) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  const body: unknown = await request.json().catch(() => null);
  const parsed = UpdateEditorialDraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La modificación del borrador no es válida");
  }
  const actor = await requirePermission("editorial.author");
  const list = await updateEditorialDraft(actor.id, listId, parsed.data);
  return NextResponse.json({ list });
});

export const DELETE = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) => {
  const { listId } = await params;
  if (!isValidUuid(listId)) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  const actor = await requirePermission("editorial.author");
  await deleteEditorialDraft(actor.id, listId);
  return new NextResponse(null, { status: 204 });
});
