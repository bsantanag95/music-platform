import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { unlinkGoogle } from "@/services/auth/identities";

// Desvincula Google de la cuenta (spec account-credentials). Rechaza con
// LAST_ACCESS_METHOD si la cuenta no tiene contraseña.
export const DELETE = withErrorHandling(async () => {
  const user = await requireUser();
  await unlinkGoogle(user.id);
  return new NextResponse(null, { status: 204 });
});
