import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { MarkNotificationsReadRequestSchema } from "@/lib/api/schemas";
import { parseTimeZoneParam } from "@/lib/api/time-zone-param";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { markRead } from "@/services/notifications/read";

// POST /api/me/notifications/read (openspec: add-notifications-core, D6).
// Marca las entradas indicadas o todas. El destinatario sale siempre de la
// sesión: una clave de otra persona no cambia nada (spec: marcar de otra
// persona). El `tz` es el mismo del listado, porque la clave de un grupo de
// seguidores lleva su día local.
export const POST = withErrorHandling(async (request: NextRequest) => {
  const parsed = MarkNotificationsReadRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", 400, "La petición no es válida");
  }
  const timeZone = parseTimeZoneParam(new URL(request.url).searchParams);
  const user = await requireUser();
  await markRead(
    user.id,
    "all" in parsed.data ? { all: true } : { groupKeys: parsed.data.groupKeys },
    timeZone,
  );
  return NextResponse.json({ ok: true });
});
