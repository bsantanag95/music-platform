import { NextRequest, NextResponse } from "next/server";
import { LoginRequestSchema } from "@/lib/api/schemas";
import { withErrorHandling } from "@/lib/with-error-handling";
import { getAuthClientIp, consumeAuthAttempt, clearAuthAttempts } from "@/services/auth/rate-limit";
import { authenticateUser } from "@/services/auth/users";
import { rotateCurrentSession, setSessionCookie } from "@/services/auth/sessions";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = LoginRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Las credenciales no son válidas", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  const identifier = body.data.identifier.toLowerCase();
  if (!consumeAuthAttempt([`login:ip:${ip}`, `login:identifier:${identifier}`])) {
    return NextResponse.json({ error: "Demasiados intentos. Probá más tarde", code: "RATE_LIMITED" }, { status: 429 });
  }

  const user = await authenticateUser(body.data.identifier, body.data.password);
  if (!user) {
    return NextResponse.json({ error: "Email, usuario o contraseña incorrectos", code: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  clearAuthAttempts([`login:ip:${ip}`, `login:identifier:${identifier}`]);
  const session = await rotateCurrentSession(user.id);
  const response = NextResponse.json({ user: publicUser(user) });
  setSessionCookie(response, session.token);
  return response;
});

function publicUser(user: { id: string; username: string; email: string; displayName: string | null }) {
  return { id: user.id, username: user.username, email: user.email, displayName: user.displayName };
}
