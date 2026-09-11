import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { requirePermission } from "@/services/auth/authorization";
import { removeEditorialItem } from "@/services/lists/editorial";

export const DELETE = withErrorHandling(async (
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string; itemId: string }> },
) => {
  const { listId, itemId } = await params;
  if (!isValidUuid(listId)) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  if (!isValidUuid(itemId)) throw new ApiError("LIST_ITEM_NOT_FOUND", 404, "El ítem no existe");
  const actor = await requirePermission("editorial.author");
  const list = await removeEditorialItem(actor.id, listId, itemId);
  return NextResponse.json({ list });
});
