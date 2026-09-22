import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { UpdateOwnProfileRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { getOwnProfile, updateProfileVisibility } from "@/services/social/profiles";
import { updateIdentity } from "@/services/profiles/identity";
import { updateAccountPreferences } from "@/services/profiles/account-settings";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return NextResponse.json({ user: await getOwnProfile(user.id) });
});

// PATCH acepta un subconjunto de { profileVisibility, displayName,
// defaultAudience, bio, pronouns, pronounSet, country, location, timezone,
// showLocalTime }. `pronounSet` es una clave de la lista cerrada, `other` (con el
// texto en `pronouns`) o null; `country` es un código de la lista. La visibilidad, las
// preferencias de cuenta (nombre visible y audiencia por defecto) y la
// identidad extendida se persisten por separado; la respuesta devuelve el
// perfil propio actualizado.
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = UpdateOwnProfileRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Los datos del perfil no son válidos");
  }

  const { profileVisibility, displayName, defaultAudience, ...identity } = parsed.data;
  if (profileVisibility) {
    await updateProfileVisibility(user.id, profileVisibility);
  }
  if (displayName !== undefined || defaultAudience !== undefined) {
    await updateAccountPreferences(user.id, { displayName, defaultAudience });
  }
  if (Object.keys(identity).length > 0) {
    await updateIdentity(user.id, identity);
  }

  return NextResponse.json({ user: await getOwnProfile(user.id) });
});
