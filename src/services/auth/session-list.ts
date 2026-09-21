import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { session } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";

export interface SessionSummary {
  id: string;
  /** Etiqueta del dispositivo; `null` = "Dispositivo desconocido" (lo localiza la interfaz). */
  deviceLabel: string | null;
  createdAt: Date;
  /** `null` en las sesiones anteriores al registro de actividad. */
  lastSeenAt: Date | null;
  current: boolean;
}

// Lo más reciente que se sabe de la sesión: su última actividad, o su inicio.
function activityOf(row: { createdAt: Date; lastSeenAt: Date | null }): number {
  return (row.lastSeenAt ?? row.createdAt).getTime();
}

/**
 * Sesiones vigentes de la persona (spec session-management, "Listar las
 * sesiones propias"): la actual primero y el resto por actividad más reciente.
 * Solo sesiones de `userId`; nunca expone el token ni su hash.
 */
export async function listMySessions(userId: string, currentSessionId: string): Promise<SessionSummary[]> {
  const rows = await db
    .select({
      id: session.id,
      deviceLabel: session.deviceLabel,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
    })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())));

  return rows
    .map((row) => ({ ...row, current: row.id === currentSessionId }))
    .sort((a, b) => {
      if (a.current !== b.current) return a.current ? -1 : 1;
      return activityOf(b) - activityOf(a);
    });
}

/**
 * Cierra una sesión propia que no sea la actual (spec session-management,
 * "Cerrar una sesión"). El filtro por `user_id` hace que el identificador de
 * una sesión ajena responda "no encontrada", igual que uno inexistente.
 */
export async function revokeSession(userId: string, sessionId: string, currentSessionId: string): Promise<void> {
  if (sessionId === currentSessionId) {
    throw new ApiError("VALIDATION_ERROR", 400, "La sesión actual se cierra con cerrar sesión");
  }
  const deleted = await db
    .delete(session)
    .where(and(eq(session.id, sessionId), eq(session.userId, userId)))
    .returning({ id: session.id });
  if (deleted.length === 0) {
    throw new ApiError("SESSION_NOT_FOUND", 404, "La sesión no existe");
  }
}
