import { NextRequest, NextResponse } from "next/server";
import { ResetPasswordRequestSchema } from "@/lib/api/schemas";
import { withErrorHandling } from "@/lib/with-error-handling";
import { resetPassword } from "@/services/auth/password-reset";
import { clearAuthAttempts, consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = ResetPasswordRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Los datos no son válidos", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  const key = `password-reset:ip:${ip}`;
  if (!consumeAuthAttempt([key])) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá más tarde", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const result = await resetPassword(body.data.token, body.data.password);
  if (result === "password_reused") {
    return NextResponse.json(
      { error: "La contraseña nueva debe ser distinta de la anterior", code: "PASSWORD_REUSED" },
      { status: 400 },
    );
  }
  if (result === "invalid_token") {
    return NextResponse.json(
      { error: "El link no es válido o expiró", code: "INVALID_RESET_TOKEN" },
      { status: 400 },
    );
  }

  clearAuthAttempts([key]);
  return NextResponse.json({ ok: true }, { status: 200 });
});
