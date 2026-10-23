import { NextResponse, type NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { listMyDiaryMonths } from "@/services/diary/diary";
import { parseTimeZoneParam } from "@/lib/api/time-zone-param";

// GET devuelve los pares año/mes con al menos una escucha del usuario, para
// poblar los filtros de Año/Mes de /me/diary (openspec: add-diary-date-navigation),
// contados en la zona horaria `tz` (UTC sin ella; openspec: redesign-diary-page).
export const GET = withErrorHandling(async (request: NextRequest) => {
  const timeZone = parseTimeZoneParam(new URL(request.url).searchParams);
  const user = await requireUser();
  const months = await listMyDiaryMonths(user.id, timeZone);
  return NextResponse.json({ months });
});
