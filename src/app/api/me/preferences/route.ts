import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { UpdatePreferencesRequestSchema } from "@/lib/api/schemas";
import { requireUser } from "@/services/auth/authorization";
import { setLocalePreference } from "@/services/profiles/account-settings";

// Guarda el idioma preferido de la interfaz (spec account-preferences).
export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const user = await requireUser();
  const parsed = UpdatePreferencesRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "El idioma no está soportado");
  }
  await setLocalePreference(user.id, parsed.data.locale);
  return NextResponse.json({ locale: parsed.data.locale });
});
