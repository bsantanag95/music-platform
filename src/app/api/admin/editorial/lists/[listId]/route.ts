import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { requirePermission } from "@/services/auth/authorization";
import { publishOfficialList, unpublishOfficialList } from "@/services/lists/editorial";

export const PATCH = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) => {
  const { listId } = await params;
  if (!isValidUuid(listId)) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  const actor = await requirePermission("editorial.publish");
  const list = await publishOfficialList(actor.id, listId);
  if (!list) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  return NextResponse.json({ ok: true });
});

export const DELETE = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) => {
  const { listId } = await params;
  if (!isValidUuid(listId)) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  const actor = await requirePermission("editorial.publish");
  const list = await unpublishOfficialList(actor.id, listId);
  if (!list) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe o ya fue retirada");
  return NextResponse.json({ ok: true });
});