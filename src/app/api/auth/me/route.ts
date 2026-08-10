import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { getCurrentUser } from "@/services/auth/authorization";

export const GET = withErrorHandling(async () => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No hay una sesión activa", code: "AUTH_REQUIRED" }, { status: 401 });
  return NextResponse.json({ user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName } });
});
