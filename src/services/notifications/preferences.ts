import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { NOTIFICATION_KINDS, OPTIONAL_NOTIFICATION_KINDS, notificationPreference } from "@/db/schema";
import type { NotificationKind, OptionalNotificationKind } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";

// Preferencias de notificación (openspec: add-notifications-core, D9;
// add-notification-milestones-and-releases, D5).
//
// Solo se guardan filas para lo que difiere del defecto del tipo: la ausencia
// de fila significa el defecto de `OPTIONAL_NOTIFICATION_KINDS`. Las filas de
// la Fase 1 siguen significando lo mismo: entonces todos los defectos eran
// `true` y solo se guardaban desactivaciones. `follow_request` y `moderation`
// no se pueden desactivar, así que ni se consultan ni se escriben.

export type NotificationPreferences = Record<NotificationKind, boolean>;

function defaultFor(kind: NotificationKind): boolean {
  return kind in OPTIONAL_NOTIFICATION_KINDS
    ? OPTIONAL_NOTIFICATION_KINDS[kind as OptionalNotificationKind]
    : true;
}

function defaultPreferences(): NotificationPreferences {
  return Object.fromEntries(
    NOTIFICATION_KINDS.map((kind) => [kind, defaultFor(kind)]),
  ) as NotificationPreferences;
}

export function isOptionalNotificationKind(kind: string): kind is OptionalNotificationKind {
  return kind in OPTIONAL_NOTIFICATION_KINDS;
}

/** Preferencias completas (fijas incluidas) para la pantalla de ajustes. */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const rows = await db
    .select({ kind: notificationPreference.kind, enabled: notificationPreference.enabled })
    .from(notificationPreference)
    .where(eq(notificationPreference.userId, userId));

  const preferences = defaultPreferences();
  for (const row of rows) preferences[row.kind] = row.enabled;
  return preferences;
}

/**
 * Guarda un cambio parcial. Un tipo fijo (o desconocido) es `VALIDATION_ERROR`:
 * la interfaz no debe poder ofrecer apagarlo. Devuelve las preferencias
 * completas ya aplicadas.
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<Record<NotificationKind, boolean>>,
): Promise<NotificationPreferences> {
  const entries = Object.entries(updates) as Array<[NotificationKind, boolean | undefined]>;
  const toWrite: Array<{ kind: OptionalNotificationKind; enabled: boolean }> = [];
  const toDelete: OptionalNotificationKind[] = [];
  for (const [kind, value] of entries) {
    if (!isOptionalNotificationKind(kind)) {
      throw new ApiError("VALIDATION_ERROR", 400, "Este tipo de notificación no se puede desactivar");
    }
    if (value === undefined) continue;
    // Volver al defecto es borrar la fila: no se guarda lo que no difiere.
    if (value === OPTIONAL_NOTIFICATION_KINDS[kind]) toDelete.push(kind);
    else toWrite.push({ kind, enabled: value });
  }

  await db.transaction(async (tx) => {
    if (toWrite.length > 0) {
      await tx
        .insert(notificationPreference)
        .values(toWrite.map((entry) => ({ userId, kind: entry.kind, enabled: entry.enabled })))
        .onConflictDoUpdate({
          target: [notificationPreference.userId, notificationPreference.kind],
          // `excluded` es la fila propuesta: sirve para activar y para desactivar.
          set: { enabled: sql`excluded.enabled` },
        });
    }
    if (toDelete.length > 0) {
      await tx
        .delete(notificationPreference)
        .where(
          and(
            eq(notificationPreference.userId, userId),
            inArray(notificationPreference.kind, toDelete),
          ),
        );
    }
  });

  return getNotificationPreferences(userId);
}
