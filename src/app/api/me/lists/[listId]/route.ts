import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { UpdateListRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { deleteList, getOwnedList, updateList } from "@/services/lists/lists";
import { z } from "zod";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  }
}

export const GET = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ listId: string }> }) => {
    const { listId } = await context.params;
    validId(listId);
    const list = await getOwnedList(listId, (await requireUser()).id);
    return NextResponse.json({ list });
  },
);

export const PATCH = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ listId: string }> }) => {
    const { listId } = await context.params;
    validId(listId);
    const body: unknown = await request.json().catch(() => null);
    const parsed = UpdateListRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "La modificación de la lista no es válida");
    }
    const list = await updateList(listId, (await requireUser()).id, parsed.data);
    return NextResponse.json({ list });
  },
);

export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ listId: string }> }) => {
    const { listId } = await context.params;
    validId(listId);
    await deleteList(listId, (await requireUser()).id);
    return new NextResponse(null, { status: 204 });
  },
);