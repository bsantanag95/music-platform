import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "@/services/auth/authorization";
import { removeItemFromList } from "@/services/lists/lists";
import { z } from "zod";

function validId(id: string, code: "LIST_NOT_FOUND" | "LIST_ITEM_NOT_FOUND" = "LIST_NOT_FOUND") {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError(code, 404, "El recurso no existe");
  }
}

export const DELETE = withErrorHandling(
  async (
    _request: NextRequest,
    context: { params: Promise<{ listId: string; itemId: string }> },
  ) => {
    const { listId, itemId } = await context.params;
    validId(listId);
    validId(itemId, "LIST_ITEM_NOT_FOUND");
    const user = await requireUser();
    const list = await removeItemFromList(listId, itemId, user.id);
    return NextResponse.json({ list });
  },
);