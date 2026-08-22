import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { UpdateListenEntryRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { deleteListenEntry, updateListenEntry } from "@/services/diary/diary";
import { z } from "zod";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("LISTEN_ENTRY_NOT_FOUND", 404, "La escucha no existe");
  }
}

export const PATCH = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    validId(id);
    const body: unknown = await request.json().catch(() => null);
    const parsed = UpdateListenEntryRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "La modificación de la escucha no es válida");
    }
    const entry = await updateListenEntry(id, (await requireUser()).id, parsed.data);
    return NextResponse.json({ entry });
  },
);

export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    validId(id);
    await deleteListenEntry(id, (await requireUser()).id);
    return new NextResponse(null, { status: 204 });
  },
);