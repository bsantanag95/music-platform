import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { UpdateNotificationPreferencesRequestSchema } from "@/lib/api/schemas";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@/services/notifications/preferences";

// GET|PUT /api/me/notification-preferences (openspec: add-notifications-core,
// D9; add-notification-digest-and-awards, D2).
//
// Devuelve siempre las claves de tipo (las fijas incluidas, que la pantalla de
// ajustes pinta pero no puede apagar), el opt-in del resumen semanal y si el
// email está verificado. Guardar un tipo fijo es `VALIDATION_ERROR`; volver al
// valor por defecto borra la fila. Activar el resumen sin email verificado es
// `409 EMAIL_NOT_VERIFIED`.
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  return NextResponse.json(await getNotificationSettings(user.id));
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const parsed = UpdateNotificationPreferencesRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "Las preferencias no son válidas");
  }
  const user = await requireUser();
  return NextResponse.json(await updateNotificationSettings(user.id, parsed.data));
});
