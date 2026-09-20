import { NextRequest, NextResponse } from "next/server";
import { VerifyEmailRequestSchema } from "@/lib/api/schemas";
import { withErrorHandling } from "@/lib/with-error-handling";
import { verifyEmail } from "@/services/auth/email-verification";
import { consumeAuthAttempt, getAuthClientIp } from "@/services/auth/rate-limit";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = VerifyEmailRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "El token no es válido", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  if (!consumeAuthAttempt([`email-verify:ip:${ip}`])) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá más tarde", code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const ok = await verifyEmail(body.data.token);
  if (!ok) {
    return NextResponse.json(
      { error: "El link no es válido o expiró", code: "INVALID_VERIFICATION_TOKEN" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
});
