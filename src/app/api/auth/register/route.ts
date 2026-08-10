import { NextRequest, NextResponse } from "next/server";
import { RegisterRequestSchema } from "@/lib/api/schemas";
import { withErrorHandling } from "@/lib/with-error-handling";
import { createSession, setSessionCookie } from "@/services/auth/sessions";
import { getAuthClientIp, consumeAuthAttempt } from "@/services/auth/rate-limit";
import { registerUser } from "@/services/auth/users";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const body = RegisterRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Los datos de registro no son válidos", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const ip = getAuthClientIp(request.headers, (request as NextRequest & { ip?: string }).ip);
  if (!consumeAuthAttempt([`register:ip:${ip}`, `register:email:${body.data.email}`])) {
    return NextResponse.json({ error: "Demasiados intentos. Probá más tarde", code: "RATE_LIMITED" }, { status: 429 });
  }

  try {
    const user = await registerUser(body.data);
    if (!user) throw new Error("No se pudo crear el usuario");
    const session = await createSession(user.id);
    const response = NextResponse.json({ user: publicUser(user) }, { status: 201 });
    setSessionCookie(response, session.token);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return NextResponse.json({ error: "El nombre de usuario ya está en uso", code: "USERNAME_TAKEN" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "EMAIL_TAKEN") {
      return NextResponse.json({ error: "El email ya está en uso", code: "EMAIL_TAKEN" }, { status: 409 });
    }
    throw error;
  }
});

function publicUser(user: { id: string; username: string; email: string; displayName: string | null }) {
  return { id: user.id, username: user.username, email: user.email, displayName: user.displayName };
}
