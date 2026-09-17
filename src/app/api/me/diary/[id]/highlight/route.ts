import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { highlightListenEntry, unhighlightListenEntry } from "@/services/diary/diary";

function validId(id: string) {
  if (!z.uuid().safeParse(id).success) {
    throw new ApiError("LISTEN_ENTRY_NOT_FOUND", 404, "La escucha no existe");
  }
}

// PUT destaca una entrada propia del diario (spec `listen-diary`, "Destacar
// una entrada del diario") — se vuelve visible más allá de su audiencia
// normal, sin modificarla. Idempotente.
export const PUT = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    validId(id);
    const user = await requireUser();
    await requireSocialActivityAllowed(user.id);
    const entry = await highlightListenEntry(user.id, id);
    return NextResponse.json({ entry });
  },
);

// DELETE quita el destacado. Idempotente.
export const DELETE = withErrorHandling(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    validId(id);
    const user = await requireUser();
    const entry = await unhighlightListenEntry(user.id, id);
    return NextResponse.json({ entry });
  },
);
