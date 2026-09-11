import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { requirePermission } from "@/services/auth/authorization";
import { submitEditorialDraft } from "@/services/lists/editorial";

export const POST = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) => {
  const { listId } = await params;
  if (!isValidUuid(listId)) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  const actor = await requirePermission("editorial.author");
  await submitEditorialDraft(actor.id, listId);
  return NextResponse.json({ ok: true });
});
