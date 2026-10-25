import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  GROUPED_NOTIFICATION_PREFERENCE,
  NOTIFICATION_KINDS,
  OPTIONAL_NOTIFICATION_KINDS,
  appUser,
  notificationPreference,
} from "@/db/schema";
import type { NotificationKind, OptionalNotificationKind } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";

// Preferencias de notificación (openspec: add-notifications-core, D9;
// add-notification-milestones-and-releases, D5;
// add-notification-digest-and-awards, D6).
//
// Solo se guardan filas para lo que difiere del defecto del tipo: la ausencia
// de fila significa el defecto de `OPTIONAL_NOTIFICATION_KINDS`. Las filas de
// la Fase 1 siguen significando lo mismo: entonces todos los defectos eran
// `true` y solo se guardaban desactivaciones. `follow_request` y `moderation`
// no se pueden desactivar, así que ni se consultan ni se escriben.
//
// `artist_award` no es un tipo de aviso: es la preferencia única que gobierna
// `artist_award_nomination` y `artist_award_win` (D6).

export type NotificationPreferences = Record<NotificationPreferenceKey, boolean>;

/** Claves que expone la pantalla: una sola para los premios (D6). */
export type NotificationPreferenceKey =
  | Exclude<NotificationKind, "artist_award_nomination" | "artist_award_win">
  | "artist_award";

/** Preferencia que gobierna un tipo de aviso; nulo = el tipo no se puede desactivar. */
export function preferenceKindOf(kind: NotificationKind): OptionalNotificationKind | null {
  const grouped = GROUPED_NOTIFICATION_PREFERENCE[kind];
  if (grouped) return grouped;
  return kind in OPTIONAL_NOTIFICATION_KINDS ? (kind as OptionalNotificationKind) : null;
}

function defaultFor(kind: NotificationPreferenceKey): boolean {
  return kind in OPTIONAL_NOTIFICATION_KINDS
    ? OPTIONAL_NOTIFICATION_KINDS[kind as OptionalNotificationKind]
    : true;
}

const PREFERENCE_KEYS = [
  ...NOTIFICATION_KINDS.filter(
    (kind) => !(kind in GROUPED_NOTIFICATION_PREFERENCE),
  ),
  "artist_award",
] as NotificationPreferenceKey[];

function defaultPreferences(): NotificationPreferences {
  return Object.fromEntries(
    PREFERENCE_KEYS.map((kind) => [kind, defaultFor(kind)]),
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

  return resolveNotificationPreferences(rows);
}

/**
 * Aplica las filas guardadas sobre los defectos del tipo. La usan la pantalla de
 * ajustes y la exportación de datos, para que las dos digan lo mismo.
 */
export function resolveNotificationPreferences(
  rows: Array<{ kind: OptionalNotificationKind; enabled: boolean }>,
): NotificationPreferences {
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
  updates: Partial<Record<NotificationKind | "artist_award", boolean>>,
): Promise<NotificationPreferences> {
  const entries = Object.entries(updates) as Array<
    [NotificationKind | "artist_award", boolean | undefined]
  >;
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

// ---------------------------------------------------------------------------
// Resumen semanal (openspec: add-notification-digest-and-awards, D2)
// ---------------------------------------------------------------------------

/** Ajustes de notificaciones: tipos + resumen por email y si se puede activar. */
export interface NotificationSettings {
  preferences: NotificationPreferences;
  /** Opt-in del resumen semanal; desactivado por defecto. */
  emailDigest: boolean;
  /** Sin email verificado no se puede activar el resumen. */
  emailVerified: boolean;
}

/**
 * Ajustes completos para la pantalla y para el contrato de la API. `emailVerified`
 * permite deshabilitar el interruptor del resumen y ofrecer verificar el email en
 * vez de dejar que el `PUT` falle.
 */
export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  const [row] = await db
    .select({
      emailDigest: appUser.notificationDigestEnabled,
      emailVerifiedAt: appUser.emailVerifiedAt,
    })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  if (!row) throw new ApiError("USER_NOT_FOUND", 404, "La cuenta no existe");

  return {
    preferences: await getNotificationPreferences(userId),
    emailDigest: row.emailDigest,
    emailVerified: row.emailVerifiedAt !== null,
  };
}

/**
 * Activa o desactiva el resumen semanal. Activarlo exige el email verificado:
 * `409 EMAIL_NOT_VERIFIED`. Desactivarlo siempre se permite (también desde la
 * baja de un correo, que no pasa por aquí).
 */
export async function setNotificationDigestEnabled(
  userId: string,
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    const [row] = await db
      .select({ emailVerifiedAt: appUser.emailVerifiedAt })
      .from(appUser)
      .where(eq(appUser.id, userId))
      .limit(1);
    if (!row) throw new ApiError("USER_NOT_FOUND", 404, "La cuenta no existe");
    if (row.emailVerifiedAt === null) {
      throw new ApiError(
        "EMAIL_NOT_VERIFIED",
        409,
        "Verifica tu email para activar el resumen semanal",
      );
    }
  }

  await db
    .update(appUser)
    .set({ notificationDigestEnabled: enabled })
    .where(eq(appUser.id, userId));
}

/** Cambio parcial de los ajustes: tipos y/o resumen. Devuelve el estado aplicado. */
export async function updateNotificationSettings(
  userId: string,
  input: {
    preferences?: Partial<Record<NotificationKind | "artist_award", boolean>>;
    emailDigest?: boolean;
  },
): Promise<NotificationSettings> {
  if (input.emailDigest !== undefined) {
    await setNotificationDigestEnabled(userId, input.emailDigest);
  }
  if (input.preferences && Object.keys(input.preferences).length > 0) {
    await updateNotificationPreferences(userId, input.preferences);
  }
  return getNotificationSettings(userId);
}
