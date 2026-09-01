import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { UpdateCollectionEntryRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { removeEntry, updateEntry } from "@/services/collection/collection";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("COLLECTION_ENTRY_NOT_FOUND", 404, "La entrada de colección no existe");
  }
}

export const PATCH = withErrorHandling(
  async (request: NextRequest, context: { params: Promise<{ entryId: string }> }) => {
    const { entryId } = await context.params;
    validId(entryId);
    const body: unknown = await request.json().catch(() => null);
    const parsed = UpdateCollectionEntryRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", 400, "La modificación de la entrada no es válida");
    }
    const user = await requireUser();
    const entry = await updateEntry(entryId, user.id, {
      format: parsed.data.format,
      attributes: parsed.data.attributes,
      note: parsed.data.note,
      audience: parsed.data.audience,
    });
    return NextResponse.json({ entry });
  },
);

export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ entryId: string }> }) => {
    const { entryId } = await context.params;
    validId(entryId);
    const user = await requireUser();
    await removeEntry(entryId, user.id);
    return new NextResponse(null, { status: 204 });
  },
);
