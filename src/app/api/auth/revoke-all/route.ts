import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/with-error-handling";
import { clearSessionCookie, deleteAllSessions } from "@/services/auth/sessions";
import { requireUser } from "@/services/auth/authorization";

export const DELETE = withErrorHandling(async () => {
  try {
    const user = await requireUser();
    await deleteAllSessions(user.id);
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    if (error instanceof ApiError && error.code === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Se requiere una sesión activa", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    throw error;
  }
});
