import { NextResponse, type NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parseTimeZoneParam } from "@/lib/api/time-zone-param";
import { requireUser } from "@/services/auth/authorization";
import { countUnseen } from "@/services/notifications/read";

// GET /api/me/notifications/count (openspec: add-notifications-core, D6).
// Entradas con algo sin leer desde la última vez que se abrió la bandeja; la
// zona solo influye en cómo se parten los seguidores por día.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const timeZone = parseTimeZoneParam(new URL(request.url).searchParams);
  const user = await requireUser();
  return NextResponse.json({ count: await countUnseen(user.id, timeZone) });
});
