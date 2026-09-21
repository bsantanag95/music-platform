import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { ConfirmEmailChangeRequestSchema } from "@/lib/api/schemas";
import { withErrorHandling } from "@/lib/with-error-handling";
import { confirmEmailChange } from "@/services/auth/email-change";
import { resolveLocale } from "@/services/auth/oauth-flow";
import { consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";

// Confirma el cambio de email desde el enlace del correo (spec
// account-credentials). El token es el factor: no exige sesión, igual que la
// verificación de email, porque el enlace se abre en cualquier navegador.
export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = ConfirmEmailChangeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El token no es válido");
  }

  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  if (!consumeAuthAttempt([`email-change-confirm:ip:${ip}`])) {
    throw new ApiError("RATE_LIMITED", 429, "Demasiados intentos. Probá más tarde");
  }

  const { email } = await confirmEmailChange(body.data.token, resolveLocale(body.data.locale));
  return NextResponse.json({ ok: true, email });
});
