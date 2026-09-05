import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "@/services/auth/authorization";
import { pinList, unpinList } from "@/services/lists/lists";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  }
}

// Fijar / desfijar una lista propia. Escribe solo en `user_list_pin`, nunca en
// `user_list` — así no dispara el trigger de `updated_at` ni un evento de feed.
export const POST = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ listId: string }> }) => {
    const { listId } = await context.params;
    validId(listId);
    await pinList(listId, (await requireUser()).id);
    return new NextResponse(null, { status: 204 });
  },
);

export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ listId: string }> }) => {
    const { listId } = await context.params;
    validId(listId);
    await unpinList(listId, (await requireUser()).id);
    return new NextResponse(null, { status: 204 });
  },
);
