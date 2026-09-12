import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { listMyDiaryMonths } from "@/services/diary/diary";

// GET devuelve los pares año/mes con al menos una escucha del usuario, para
// poblar los filtros de Año/Mes de /me/diary (openspec: add-diary-date-navigation).
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const months = await listMyDiaryMonths(user.id);
  return NextResponse.json({ months });
});
