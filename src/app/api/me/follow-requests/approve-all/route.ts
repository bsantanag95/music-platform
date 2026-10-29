import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { approveAllRequests } from "@/services/social/following";

// Aprueba todas las solicitudes pendientes recibidas (openspec: add-follow-requests-sent-and-bulk, D3).
export const POST = withErrorHandling(async () => {
  const user = await requireUser();
  return NextResponse.json(await approveAllRequests(user.id));
});
