import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ChangePasswordRequestSchema, CreatePasswordRequestSchema } from "@/lib/api/schemas";
import { requireSession } from "@/services/auth/authorization";
import { resolveLocale } from "@/services/auth/oauth-flow";
import { changePassword, createPassword } from "@/services/auth/password-change";

// Cambia la contraseña de una cuenta que ya tiene una (spec account-credentials,
// "Cambiar la contraseña"): exige la actual y puede cerrar las demás sesiones.
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const current = await requireSession();
  const parsed = ChangePasswordRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los datos de la contraseña no son válidos");
  }
  await changePassword(current, {
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
    revokeOtherSessions: parsed.data.revokeOtherSessions,
    locale: resolveLocale(parsed.data.locale),
  });
  return NextResponse.json({ ok: true });
});

// Crea la contraseña de una cuenta que no tiene (alta con Google), con
// autenticación reciente (spec account-credentials, "Crear contraseña en una
// cuenta sin ella").
export const POST = withErrorHandling(async (request: NextRequest) => {
  const current = await requireSession();
  const parsed = CreatePasswordRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La contraseña no es válida");
  }
  await createPassword(current, {
    newPassword: parsed.data.newPassword,
    locale: resolveLocale(parsed.data.locale),
  });
  return NextResponse.json({ ok: true });
});
