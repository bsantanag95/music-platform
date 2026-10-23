import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { UpdateNotificationPreferencesRequestSchema } from "@/lib/api/schemas";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/services/notifications/preferences";

// GET|PUT /api/me/notification-preferences (openspec: add-notifications-core,
// D9). Devuelve siempre las seis claves: la pantalla de ajustes pinta también
// las fijas, que no se pueden desactivar. Guardar un tipo fijo es
// `VALIDATION_ERROR`; volver al valor por defecto borra la fila.
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return NextResponse.json({ preferences: await getNotificationPreferences(user.id) });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const parsed = UpdateNotificationPreferencesRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Las preferencias no son válidas");
  }
  const user = await requireUser();
  return NextResponse.json({
    preferences: await updateNotificationPreferences(user.id, parsed.data.preferences),
  });
});
