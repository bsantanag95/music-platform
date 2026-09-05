import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "@/services/auth/authorization";
import { unsaveList } from "@/services/lists/saved-lists";

export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ listId: string }> }) => {
    const { listId } = await context.params;
    if (!z.uuid().safeParse(listId).success) {
      throw new ApiError("VALIDATION_ERROR", 400, "El identificador de lista no es válido");
    }
    await unsaveList((await requireUser()).id, listId);
    return new NextResponse(null, { status: 204 });
  },
);
