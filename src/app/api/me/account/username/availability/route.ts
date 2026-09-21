import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { consumeAuthAttempt } from "@/services/auth/rate-limit";
import { checkUsernameAvailability } from "@/services/auth/username";
import { ApiError } from "@/lib/api/errors";

// ¿Es válido y está disponible este usuario? (spec account-username,
// "Disponibilidad consultable antes de guardar"). Requiere sesión y está
// limitado por usuario para que no sirva de sondeo masivo de usuarios; nunca
// dice quién lo tiene.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  if (!consumeAuthAttempt([`username-availability:user:${user.id}`], Date.now(), { max: 120 })) {
    throw new ApiError("RATE_LIMITED", 429, "Demasiadas consultas. Probá más tarde");
  }
  const candidate = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 64);
  if (candidate.length === 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "Falta el usuario a consultar");
  }
  return NextResponse.json(await checkUsernameAvailability(user.id, candidate));
});
