import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { parsePagination } from "@/lib/api/pagination";
import { requireUser } from "@/services/auth/authorization";
import { listFollowRequests, listFollowRequestsPage } from "@/services/social/following";
import { withFollowRequestContext } from "@/services/social/follow-request-context";

// Solicitudes pendientes recibidas. Con `cursor` (vacío = primera página) responde la página de la bandeja, por fecha
// y con cursor (openspec: refine-follow-requests-phase1, D1) y el contexto de cada una (enrich-follow-requests-context,
// D2); sin él conserva la forma paginada de siempre.
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const user = await requireUser();
  if (searchParams.has("cursor")) {
    const page = await listFollowRequestsPage(user.id, { cursor: searchParams.get("cursor") || null });
    return NextResponse.json(await withFollowRequestContext(user.id, page));
  }
  const { page, pageSize } = parsePagination(searchParams);
  return NextResponse.json(await listFollowRequests(user.id, page, pageSize));
});
