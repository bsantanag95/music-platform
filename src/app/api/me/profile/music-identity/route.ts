import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { UpdateMusicIdentityRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { updateMusicIdentity } from "@/services/profiles/music-identity";

// PUT reemplaza "Me defino como", géneros y/o formatos de escucha (spec
// profile-music-identity). Cada campo enviado sustituye al anterior (`[]` lo
// vacía); los que no se envían no se tocan. Listas cerradas, con tope y sin
// repetidos.
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = UpdateMusicIdentityRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los datos de identidad musical no son válidos");
  }
  return NextResponse.json(await updateMusicIdentity(user.id, parsed.data));
});
