import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { SessionIdParamSchema } from "@/lib/api/schemas";
import { requireSession } from "@/services/auth/authorization";
import { revokeSession } from "@/services/auth/session-list";

// Cierra una sesión propia que no sea la actual (spec session-management,
// "Cerrar una sesión"). El identificador de una sesión ajena responde 404.
export const DELETE = withErrorHandling(
  async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const current = await requireSession();
    const parsed = SessionIdParamSchema.safeParse((await params).id);
    if (!parsed.success) {
      throw new ApiError("SESSION_NOT_FOUND", 404, "La sesión no existe");
    }
    await revokeSession(current.user.id, parsed.data, current.sessionId);
    return new NextResponse(null, { status: 204 });
  },
);
