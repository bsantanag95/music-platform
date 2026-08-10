import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { clearSessionCookie, deleteSessionByToken } from "@/services/auth/sessions";
import { cookies } from "next/headers";

const logout = withErrorHandling(async () => {
  const token = (await cookies()).get("music_session")?.value;
  await deleteSessionByToken(token);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
});

export const POST = logout;
export const DELETE = logout;
