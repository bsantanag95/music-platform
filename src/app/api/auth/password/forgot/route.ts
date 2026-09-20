import { NextRequest, NextResponse } from "next/server";
import { ForgotPasswordRequestSchema } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/with-error-handling";
import { resolveLocale } from "@/services/auth/oauth-flow";
import { requestPasswordReset } from "@/services/auth/password-reset";
import { consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";
import { EmailConfigError, getEmailTransport } from "@/services/email";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = ForgotPasswordRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "El email no es válido", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  const email = body.data.email;
  if (!consumeAuthAttempt([`password-forgot:ip:${ip}`, `password-forgot:email:${email}`])) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá más tarde", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  // Fail-closed antes de tocar la base: sin transporte de email real en
  // producción el flujo no arranca (no se generan tokens).
  try {
    getEmailTransport();
  } catch (error) {
    if (error instanceof EmailConfigError) {
      throw new ApiError("EMAIL_CONFIG_MISSING", 503, "El envío de email no está configurado");
    }
    throw error;
  }

  const locale = resolveLocale(body.data.locale);
  // La respuesta no espera el envío: mantiene el 202 genérico y evita filtrar
  // por timing si la cuenta existe.
  void requestPasswordReset(email, locale).catch((error) => {
    console.error("No se pudo procesar el pedido de restablecimiento:", error);
  });

  return NextResponse.json({ ok: true }, { status: 202 });
});
