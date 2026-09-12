import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { getCurrentUser } from "@/services/auth/authorization";
import { listCommunityActivity } from "@/services/activity/community-activity";

// Sección "Recientes" de `/activity`: ratings, comentarios y reseñas de
// cualquier usuario con perfil público, sin requerir seguimiento. Público; con
// sesión excluye autores bloqueados en cualquier dirección.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  // Default 10, no 20: mismo tamaño de página que `listCommunityActivity` y el
  // cliente `getCommunityActivity` (la fusión de tres fuentes ya es más cara
  // que una sola tabla).
  const { page, pageSize } = parsePagination(searchParams, 10);
  const user = await getCurrentUser();
  return NextResponse.json(await listCommunityActivity(user?.id ?? null, page, pageSize));
});
