import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, session, shareEvent } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { requireRecentAuth } from "./recent-auth";
import type { ResolvedSession } from "./sessions";
import { imageService } from "@/services/storage";

// Ciclo de vida de la cuenta (spec account-lifecycle): desactivar y reactivar
// (oculta a la persona pero conserva su actividad) y eliminar (borra todo lo que
// creó, sin vuelta atrás). El criterio de "cuenta activa" que aplican las consultas
// vive en `account-status.ts`.

// `ON DELETE RESTRICT` responde 23001 (restrict_violation); `NO ACTION` responde 23503
// (foreign_key_violation). Las filas de auditoría usan RESTRICT, pero se aceptan ambas.
const FK_BLOCK_CODES = new Set(["23001", "23503"]);

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && "code" in error && FK_BLOCK_CODES.has(String(error.code))
  );
}

/**
 * Desactiva la cuenta con el factor de identidad de las acciones sensibles.
 * Registra la fecha y cierra TODAS las sesiones de la persona (incluida la
 * actual) en una sola transacción: una cuenta desactivada nunca tiene sesión. No
 * borra ningún contenido, seguimiento, valoración, reseña ni lista.
 */
export async function deactivateAccount(current: ResolvedSession, password?: string): Promise<void> {
  await requireRecentAuth(current, password);
  const userId = current.user.id;
  await db.transaction(async (tx) => {
    await tx.update(appUser).set({ deactivatedAt: new Date() }).where(eq(appUser.id, userId));
    await tx.delete(session).where(eq(session.userId, userId));
  });
}

/**
 * Reactiva la cuenta si estaba desactivada: iniciar sesión (contraseña o Google)
 * borra la marca. Devuelve `true` si la reactivó. No hace nada en una cuenta
 * activa. Con la marca borrada el perfil, los seguimientos y el contenido vuelven
 * a aparecer tal como estaban.
 */
export async function reactivateAccount(userId: string): Promise<boolean> {
  const updated = await db
    .update(appUser)
    .set({ deactivatedAt: null })
    .where(and(eq(appUser.id, userId), isNotNull(appUser.deactivatedAt)))
    .returning({ id: appUser.id });
  return updated.length > 0;
}

/**
 * Los `share_event` de lo que era de una cuenta (spec share-events): `share_event` no tiene FK, la referencia es
 * texto. Perfil, colección y huella llevan el id de la cuenta; el resto, el id de una fila suya.
 */
export function ownShareEvents(userId: string) {
  return sql`
    (target_kind IN ('profile', 'user_collection', 'fingerprint') AND target_ref = ${userId})
    OR (target_kind = 'review' AND target_ref IN (SELECT id::text FROM review WHERE user_id = ${userId}::uuid))
    OR (target_kind = 'comment' AND target_ref IN (SELECT id::text FROM comment WHERE user_id = ${userId}::uuid))
    OR (target_kind IN ('list', 'camino') AND target_ref IN (SELECT id::text FROM user_list WHERE owner_id = ${userId}::uuid))
    OR (target_kind = 'rating' AND target_ref IN (SELECT id::text FROM rating WHERE user_id = ${userId}::uuid))
    OR (target_kind = 'listen' AND target_ref IN (SELECT id::text FROM listen_entry WHERE user_id = ${userId}::uuid))
  `;
}

/**
 * Elimina la cuenta de forma definitiva. Exige el usuario como confirmación (igual
 * al de la cuenta; solo se ignoran los espacios de los bordes) y el factor de identidad. `DELETE FROM app_user` borra en cascada todo lo
 * que la persona creó (la base ya lo declara con `ON DELETE CASCADE`). En la misma transacción, y antes, borra
 * los `share_event` de lo que era suyo: esa tabla no tiene FK.
 *
 * Una cuenta con historial de moderación o editorial no se puede borrar: sus filas
 * de auditoría referencian a la persona con `RESTRICT`. La violación de clave
 * foránea (`23001`/`23503`) se traduce a `ACCOUNT_DELETION_BLOCKED` y, al ser una sola
 * transacción, no cambia nada: se ofrece desactivar en su lugar.
 */
export async function deleteAccount(
  current: ResolvedSession,
  input: { username: string; password?: string },
): Promise<void> {
  if (input.username.trim() !== current.user.username) {
    throw new ApiError("VALIDATION_ERROR", 400, "El usuario de confirmación no coincide");
  }
  await requireRecentAuth(current, input.password);

  const [avatar] = await db
    .select({ avatarImageId: appUser.avatarImageId })
    .from(appUser)
    .where(eq(appUser.id, current.user.id))
    .limit(1);
  const avatarImageId = avatar?.avatarImageId ?? null;

  try {
    await db.transaction(async (tx) => {
      // Antes que la cuenta: la cascada borra las filas por las que se reconocen sus eventos.
      await tx.delete(shareEvent).where(ownShareEvents(current.user.id));
      await tx.delete(appUser).where(eq(appUser.id, current.user.id));
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new ApiError(
        "ACCOUNT_DELETION_BLOCKED",
        409,
        "Esta cuenta tiene historial de moderación o editorial y no se puede eliminar",
      );
    }
    throw error;
  }

  if (avatarImageId) {
    await imageService.deleteImage(avatarImageId).catch(() => {});
  }
}
