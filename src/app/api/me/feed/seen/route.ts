import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { markFeedSeen } from "@/services/feed/feed";

// PUT /api/me/feed/seen (openspec: redesign-feed-people, D2). Lo llama `/me/feed` al montarse en el navegador, nunca
// el render del servidor: un prefetch no debe mover la marca. Lo posterior a esta marca será "nuevo" en la próxima
// visita.
export const PUT = withErrorHandling(async () => {
  const user = await requireUser();
  await markFeedSeen(user.id);
  return NextResponse.json({ ok: true });
});
