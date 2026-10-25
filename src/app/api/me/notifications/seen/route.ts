import { NextResponse, type NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parseNotificationTabParam } from "@/lib/api/notification-tab-param";
import { requireUser } from "@/services/auth/authorization";
import { markSeen } from "@/services/notifications/read";

// PUT /api/me/notifications/seen?tab=for_you|releases (openspec:
// add-notifications-core, D6; add-notification-milestones-and-releases, D7).
// Abrir la campana o la página pone el contador a cero; abrir "Novedades" mueve
// su propia marca (el punto). Las entradas siguen sin leer hasta que se abren o
// se marcan todas.
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const tab = parseNotificationTabParam(new URL(request.url).searchParams);
  const user = await requireUser();
  await markSeen(user.id, tab);
  return NextResponse.json({ ok: true });
});
