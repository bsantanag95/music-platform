import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { markSeen } from "@/services/notifications/read";

// PUT /api/me/notifications/seen (openspec: add-notifications-core, D6). Abrir
// la campana o la página pone el contador a cero; las entradas siguen sin leer
// hasta que se abren o se marcan todas.
export const PUT = withErrorHandling(async () => {
  const user = await requireUser();
  await markSeen(user.id);
  return NextResponse.json({ ok: true });
});
