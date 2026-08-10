import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { clearSessionCookie, deleteSessionByToken } from "@/services/auth/sessions";
import { cookies } from "next/headers";

export const POST = withErrorHandling(async () => {
  const token = (await cookies()).get("music_session")?.value;
  await deleteSessionByToken(token);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
});
