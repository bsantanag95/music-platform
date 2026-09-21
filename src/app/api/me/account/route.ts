import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { DeleteAccountRequestSchema } from "@/lib/api/schemas";
import { requireSession } from "@/services/auth/authorization";
import { deleteAccount } from "@/services/auth/account-lifecycle";
import { clearSessionCookie } from "@/services/auth/sessions";

// Elimina la cuenta de forma definitiva (spec account-lifecycle): borra todo lo que
// la persona creó y limpia la cookie. Exige el usuario como confirmación y el factor
// de identidad. `409 ACCOUNT_DELETION_BLOCKED` si tiene historial de moderación o
// editorial (no cambia nada: se ofrece desactivar).
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const current = await requireSession();
  const parsed = DeleteAccountRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Faltan los datos de confirmación");
  }
  await deleteAccount(current, parsed.data);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
});
