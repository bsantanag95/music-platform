import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { RequestEmailChangeRequestSchema } from "@/lib/api/schemas";
import { requireSession } from "@/services/auth/authorization";
import { getPendingEmailChange, requestEmailChange } from "@/services/auth/email-change";
import { resolveLocale } from "@/services/auth/oauth-flow";
import { consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";
import { EmailConfigError } from "@/services/email";

// Cambio de email pendiente de confirmar de la persona (Ajustes lo avisa).
export const GET = withErrorHandling(async () => {
  const { user } = await requireSession();
  const pending = await getPendingEmailChange(user.id);
  return NextResponse.json({
    pending: pending ? { newEmail: pending.newEmail, expiresAt: pending.expiresAt.toISOString() } : null,
  });
});

// Pide cambiar el email (spec account-credentials, "Cambio de email con
// confirmación por correo"): manda un enlace al email nuevo; el actual no
// cambia hasta confirmar.
export const POST = withErrorHandling(async (request: NextRequest) => {
  const current = await requireSession();
  const parsed = RequestEmailChangeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El email no es válido");
  }

  // Cada pedido manda un correo: cuenta dentro de la ventana, por usuario y por IP.
  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  if (!consumeAuthAttempt([`email-change:user:${current.user.id}`, `email-change:ip:${ip}`])) {
    throw new ApiError("RATE_LIMITED", 429, "Demasiados intentos. Probá más tarde");
  }

  try {
    await requestEmailChange(current, {
      newEmail: parsed.data.newEmail,
      password: parsed.data.password,
      locale: resolveLocale(parsed.data.locale),
    });
  } catch (error) {
    if (error instanceof EmailConfigError) {
      throw new ApiError("EMAIL_CONFIG_MISSING", 503, "El envío de email no está configurado");
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
});
