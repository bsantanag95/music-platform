import { NextResponse, type NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parseTimeZoneParam } from "@/lib/api/time-zone-param";
import { requireUser } from "@/services/auth/authorization";
import { countUnseen, hasNewReleases } from "@/services/notifications/read";

// GET /api/me/notifications/count (openspec: add-notifications-core, D6;
// add-notification-milestones-and-releases, D7). `count` solo cuenta "Para ti";
// `newReleases` es el punto (sin cifra) de "Novedades". La zona solo influye en
// cómo se parten los seguidores por día.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const timeZone = parseTimeZoneParam(new URL(request.url).searchParams);
  const user = await requireUser();
  const [count, newReleases] = await Promise.all([
    countUnseen(user.id, timeZone),
    hasNewReleases(user.id),
  ]);
  return NextResponse.json({ count, newReleases });
});
