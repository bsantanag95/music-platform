import { after, NextResponse, type NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parseNotificationTabParam } from "@/lib/api/notification-tab-param";
import { parseTimeZoneParam } from "@/lib/api/time-zone-param";
import { requireUser } from "@/services/auth/authorization";
import { listNotificationGroups, pruneNotifications } from "@/services/notifications/read";

// GET /api/me/notifications?tab=for_you|releases (openspec: add-notifications-core,
// D4, D5 y D10; add-notification-milestones-and-releases, D7). Devuelve las
// entradas agrupadas del lector con los filtros de privacidad de D4 y su cursor;
// la retención corre en `after()` para no sumar latencia a la respuesta ni
// depender de un proceso operativo. Sin `tab` se mantiene "Para ti".
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const timeZone = parseTimeZoneParam(searchParams);
  const tab = parseNotificationTabParam(searchParams);
  const user = await requireUser();
  const page = await listNotificationGroups(user.id, {
    cursor: searchParams.get("cursor"),
    timeZone,
    tab,
  });
  after(() => pruneNotifications(user.id));
  return NextResponse.json(page);
});
