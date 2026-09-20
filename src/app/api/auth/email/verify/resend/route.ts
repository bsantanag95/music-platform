import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { ResendEmailRequestSchema } from "@/lib/api/schemas";
import { withErrorHandling } from "@/lib/with-error-handling";
import { resendEmailVerification } from "@/services/auth/email-verification";
import { resolveLocale } from "@/services/auth/oauth-flow";
import { consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";
import { resolveSession } from "@/services/auth/sessions";
import { EmailConfigError } from "@/services/email";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await resolveSession();
  if (!session) {
    throw new ApiError("AUTH_REQUIRED", 401, "Se requiere sesión para reenviar la verificación");
  }

  const body = ResendEmailRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Los datos no son válidos", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  // No se limpian los contadores al enviar: el reenvío es la acción que se
  // quiere acotar, así que cada envío cuenta dentro de la ventana.
  const keys = [`email-resend:user:${session.user.id}`, `email-resend:ip:${ip}`];
  if (!consumeAuthAttempt(keys)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá más tarde", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  let result: Awaited<ReturnType<typeof resendEmailVerification>>;
  try {
    result = await resendEmailVerification(session.user.id, resolveLocale(body.data.locale));
  } catch (error) {
    if (error instanceof EmailConfigError) {
      throw new ApiError("EMAIL_CONFIG_MISSING", 503, "El envío de email no está configurado");
    }
    throw error;
  }

  if (result === "already_verified") {
    return NextResponse.json(
      { error: "Tu email ya está verificado", code: "EMAIL_ALREADY_VERIFIED" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
});
