import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { DeactivateAccountRequestSchema } from "@/lib/api/schemas";
import { requireSession } from "@/services/auth/authorization";
import { deactivateAccount } from "@/services/auth/account-lifecycle";
import { clearSessionCookie } from "@/services/auth/sessions";

// Desactiva la cuenta (spec account-lifecycle): oculta a la persona pero conserva
// su actividad, cierra TODAS sus sesiones y limpia la cookie. Iniciar sesión la
// reactiva. Exige el factor de identidad (contraseña o sesión reciente).
export const POST = withErrorHandling(async (request: NextRequest) => {
  const current = await requireSession();
  const parsed = DeactivateAccountRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los datos no son válidos");
  }
  await deactivateAccount(current, parsed.data.password);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
});
