import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { listSentRequestsPage } from "@/services/social/following";

// Solicitudes enviadas y pendientes, por fecha y con cursor (openspec: add-follow-requests-sent-and-bulk, D2).
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const user = await requireUser();
  return NextResponse.json(await listSentRequestsPage(user.id, { cursor: searchParams.get("cursor") || null }));
});
