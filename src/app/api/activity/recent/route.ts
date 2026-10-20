import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { getCurrentUser } from "@/services/auth/authorization";
import { ApiError } from "@/lib/api/errors";
import { COMMUNITY_ACTIVITY_KINDS, type CommunityActivityKind } from "@/lib/api/schemas";
import { listCommunityActivity } from "@/services/activity/community-activity";

// Mismo criterio que `parseKind` de `/api/me/feed`: 400 en vez de dejar pasar un valor que silenciosamente no
// filtraría nada. Solo los tipos que compone esta fuente (`listen`, por ejemplo, no).
function parseKind(searchParams: URLSearchParams): CommunityActivityKind | undefined {
  const value = searchParams.get("kind");
  if (value === null) return undefined;
  if (!COMMUNITY_ACTIVITY_KINDS.includes(value as CommunityActivityKind)) {
    throw new ApiError("VALIDATION_ERROR", 400, 'El valor de "kind" no es válido');
  }
  return value as CommunityActivityKind;
}

// Sección "Recientes" de `/activity`: ratings, comentarios y reseñas de
// cualquier usuario con perfil público, sin requerir seguimiento. Público; con
// sesión excluye autores bloqueados en cualquier dirección.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  // Default 10, no 20: mismo tamaño de página que `listCommunityActivity` y el
  // cliente `getCommunityActivity` (la fusión de tres fuentes ya es más cara
  // que una sola tabla).
  const { page, pageSize } = parsePagination(searchParams, 10);
  const kind = parseKind(searchParams);
  const user = await getCurrentUser();
  return NextResponse.json(await listCommunityActivity(user?.id ?? null, page, pageSize, { kind }));
});
