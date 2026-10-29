import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireSession } from "@/services/auth/authorization";
import { listMySessions } from "@/services/auth/session-list";
import { deleteOtherSessions } from "@/services/auth/sessions";

// Sesiones vigentes de la persona, la actual primero (spec session-management,
// "Listar las sesiones propias"). Nunca incluye el token ni su hash.
export const GET = withErrorHandling(async () => {
  const current = await requireSession();
  const sessions = await listMySessions(current.user.id, current.sessionId);
  return NextResponse.json({
    sessions: sessions.map((item) => ({
      id: item.id,
      deviceLabel: item.deviceLabel,
      createdAt: item.createdAt.toISOString(),
      lastSeenAt: item.lastSeenAt ? item.lastSeenAt.toISOString() : null,
      current: item.current,
    })),
  });
});

// Cierra todas las sesiones de la persona salvo la actual (openspec: refine-settings-editing, D4): "Cerrar las demás"
// de Cuenta y seguridad. La actual sigue abierta; "Cerrar todas" (`/api/auth/revoke-all`) también la cierra.
export const DELETE = withErrorHandling(async () => {
  const current = await requireSession();
  await deleteOtherSessions(current.user.id, current.sessionId);
  return new NextResponse(null, { status: 204 });
});
