import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { AddListItemRequestSchema, ReorderListItemsRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { addItemToList, reorderListItems } from "@/services/lists/lists";
import { z } from "zod";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  }
}

export const POST = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ listId: string }> }) => {
    const { listId } = await context.params;
    validId(listId);
    const body: unknown = await request.json().catch(() => null);
    const parsed = AddListItemRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "El ítem no es válido");
    }
    const user = await requireUser();
    const list = await addItemToList(listId, user.id, parsed.data.target);
    return NextResponse.json({ list }, { status: 201 });
  },
);

export const PUT = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ listId: string }> }) => {
    const { listId } = await context.params;
    validId(listId);
    const body: unknown = await request.json().catch(() => null);
    const parsed = ReorderListItemsRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "El reordenamiento no es válido");
    }
    const user = await requireUser();
    const list = await reorderListItems(listId, user.id, parsed.data.itemIds);
    return NextResponse.json({ list });
  },
);