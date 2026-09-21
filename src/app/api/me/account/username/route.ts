import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { ChangeUsernameRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { changeUsername } from "@/services/auth/username";

// Cambia el usuario propio (spec account-username): un cambio cada 30 días, el
// anterior queda reservado y su enlace redirige durante ese tiempo.
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = ChangeUsernameRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El usuario no es válido");
  }
  const result = await changeUsername(user.id, parsed.data.username);
  return NextResponse.json({ username: result.username, nextChangeAt: result.nextChangeAt.toISOString() });
});
