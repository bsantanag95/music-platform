import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { NOTIFICATION_KINDS, OPTIONAL_NOTIFICATION_KINDS, notificationPreference } from "@/db/schema";
import type { NotificationKind, OptionalNotificationKind } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";

// Preferencias de notificación (openspec: add-notifications-core, D9).
//
// Solo se guardan filas para lo que difiere del defecto (todo activado): la
// ausencia de fila significa "activado". `follow_request` y `moderation` no se
// pueden desactivar, así que ni se consultan ni se escriben.

const OPTIONAL_KINDS: readonly string[] = OPTIONAL_NOTIFICATION_KINDS;

export type NotificationPreferences = Record<NotificationKind, boolean>;

function defaultPreferences(): NotificationPreferences {
  return Object.fromEntries(NOTIFICATION_KINDS.map((kind) => [kind, true])) as NotificationPreferences;
}

export function isOptionalNotificationKind(kind: string): kind is OptionalNotificationKind {
  return OPTIONAL_KINDS.includes(kind);
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
  const disabled: OptionalNotificationKind[] = [];
  const enabled: OptionalNotificationKind[] = [];
  for (const [kind, value] of entries) {
    if (!isOptionalNotificationKind(kind)) {
      throw new ApiError("VALIDATION_ERROR", 400, "Este tipo de notificación no se puede desactivar");
    }
    if (value === false) disabled.push(kind);
    else if (value === true) enabled.push(kind);
  }

  await db.transaction(async (tx) => {
    if (disabled.length > 0) {
      await tx
        .insert(notificationPreference)
        .values(disabled.map((kind) => ({ userId, kind, enabled: false })))
        .onConflictDoUpdate({
          target: [notificationPreference.userId, notificationPreference.kind],
          set: { enabled: false },
        });
    }
    if (enabled.length > 0) {
      // Volver al defecto es borrar la fila: no se guarda lo que no difiere.
      await tx
        .delete(notificationPreference)
        .where(
          and(
            eq(notificationPreference.userId, userId),
            inArray(notificationPreference.kind, enabled),
          ),
        );
    }
  });

  return getNotificationPreferences(userId);
}
