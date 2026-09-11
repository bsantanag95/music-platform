import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { AddListItemRequestSchema, ReorderListItemsRequestSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { requirePermission } from "@/services/auth/authorization";
import {
  addEditorialItem,
  reorderEditorialItems,
} from "@/services/lists/editorial";

export const POST = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) => {
  const { listId } = await params;
  if (!isValidUuid(listId)) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  const body: unknown = await request.json().catch(() => null);
  const parsed = AddListItemRequestSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El ítem no es válido");
  const actor = await requirePermission("editorial.author");
  const list = await addEditorialItem(actor.id, listId, parsed.data.target);
  return NextResponse.json({ list }, { status: 201 });
});

export const PUT = withErrorHandling(async (
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> },
) => {
  const { listId } = await params;
  if (!isValidUuid(listId)) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  const body: unknown = await request.json().catch(() => null);
  const parsed = ReorderListItemsRequestSchema.safeParse(body);
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "El reordenamiento no es válido");
  const actor = await requirePermission("editorial.author");
  const list = await reorderEditorialItems(actor.id, listId, parsed.data.itemIds);
  return NextResponse.json({ list });
});
