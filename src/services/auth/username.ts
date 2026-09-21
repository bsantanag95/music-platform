import { and, eq, gt, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, usernameAlias } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { USERNAME_CHANGE_COOLDOWN_MS, validateUsernameFormat, type UsernameProblem } from "./account-rules";

// Cambio de usuario (spec account-username): un cambio cada 30 días, el usuario
// anterior queda reservado 30 días (`username_alias`) y su enlace redirige.
// La disponibilidad compara sin distinguir mayúsculas: `app_user.username` sí
// las distingue por historia (existen `Ana` y `ana`), pero un cambio nuevo no
// debe permitir suplantar a alguien por diferir en una mayúscula.

function isUniqueViolation(error: unknown): error is { code: "23505" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

const lowerUsername = (candidate: string) => sql`lower(${appUser.username}) = ${candidate.toLowerCase()}`;
const lowerAlias = (candidate: string) => sql`lower(${usernameAlias.username}) = ${candidate.toLowerCase()}`;

export type UsernameUnavailableReason = UsernameProblem | "current" | "taken";

export interface UsernameAvailability {
  valid: boolean;
  available: boolean;
  /** Por qué no se puede usar; `null` si está disponible. Nunca revela quién lo tiene. */
  reason: UsernameUnavailableReason | null;
}

/** Fecha en que vuelve a estar permitido un cambio; `null` si ya se puede. */
export function nextUsernameChangeAt(changedAt: Date | null, now = new Date()): Date | null {
  if (!changedAt) return null;
  const next = new Date(changedAt.getTime() + USERNAME_CHANGE_COOLDOWN_MS);
  return next > now ? next : null;
}

/** ¿Alguien tiene reservado este usuario? Aplica a registros nuevos (contraseña o Google). */
export async function isUsernameReserved(candidate: string): Promise<boolean> {
  const [alias] = await db
    .select({ id: usernameAlias.id })
    .from(usernameAlias)
    .where(and(lowerAlias(candidate), gt(usernameAlias.expiresAt, new Date())))
    .limit(1);
  return alias !== undefined;
}

/**
 * Si el usuario es el anterior de alguien y su reserva sigue vigente, devuelve
 * su usuario actual (las páginas de perfil redirigen ahí). Vencida la reserva,
 * `null`.
 */
export async function resolveUsernameAlias(username: string): Promise<string | null> {
  const [row] = await db
    .select({ username: appUser.username })
    .from(usernameAlias)
    .innerJoin(appUser, eq(usernameAlias.userId, appUser.id))
    .where(and(lowerAlias(username), gt(usernameAlias.expiresAt, new Date())))
    .limit(1);
  return row?.username ?? null;
}

/** Cuándo se puede volver a cambiar el usuario (para el diálogo de Ajustes). */
export async function getUsernameChangeStatus(
  userId: string,
): Promise<{ username: string; nextChangeAt: Date | null }> {
  const [user] = await db
    .select({ username: appUser.username, usernameChangedAt: appUser.usernameChangedAt })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  if (!user) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
  return { username: user.username, nextChangeAt: nextUsernameChangeAt(user.usernameChangedAt) };
}

/**
 * ¿Es válido y está disponible? (spec account-username, "Disponibilidad
 * consultable antes de guardar"). No expone datos de la cuenta que lo usa.
 */
export async function checkUsernameAvailability(
  userId: string,
  candidate: string,
): Promise<UsernameAvailability> {
  const problem = validateUsernameFormat(candidate);
  if (problem) return { valid: false, available: false, reason: problem };

  const [user] = await db
    .select({ username: appUser.username })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  if (user?.username === candidate) return { valid: true, available: false, reason: "current" };

  const [taken] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(and(lowerUsername(candidate), ne(appUser.id, userId)))
    .limit(1);
  if (taken) return { valid: true, available: false, reason: "taken" };

  const [alias] = await db
    .select({ userId: usernameAlias.userId })
    .from(usernameAlias)
    .where(and(lowerAlias(candidate), gt(usernameAlias.expiresAt, new Date())))
    .limit(1);
  if (alias && alias.userId !== userId) return { valid: true, available: false, reason: "taken" };

  return { valid: true, available: true, reason: null };
}

/**
 * Cambia el usuario de la persona. Una sola transacción, con la fila bloqueada
 * para que dos cambios simultáneos no se salten el enfriamiento:
 * enfriamiento → disponibilidad (incluida la reserva ajena) → recuperación del
 * propio alias → reserva del usuario anterior → actualización.
 */
export async function changeUsername(
  userId: string,
  rawUsername: string,
): Promise<{ username: string; nextChangeAt: Date }> {
  const next = rawUsername.trim();
  if (validateUsernameFormat(next) !== null) {
    throw new ApiError("VALIDATION_ERROR", 400, "El usuario no es válido");
  }

  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .select({ username: appUser.username, usernameChangedAt: appUser.usernameChangedAt })
        .from(appUser)
        .where(eq(appUser.id, userId))
        .for("update")
        .limit(1);
      if (!user) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
      if (user.username === next) {
        throw new ApiError("VALIDATION_ERROR", 400, "Ese ya es tu usuario");
      }

      const now = new Date();
      const cooldownEnds = nextUsernameChangeAt(user.usernameChangedAt, now);
      if (cooldownEnds) {
        throw new ApiError(
          "USERNAME_CHANGE_COOLDOWN",
          409,
          `Podés volver a cambiar tu usuario el ${cooldownEnds.toISOString()}`,
        );
      }

      // Los alias vencidos ya no reservan nada y ocuparían el índice único.
      await tx.delete(usernameAlias).where(lte(usernameAlias.expiresAt, now));

      const [clash] = await tx
        .select({ id: appUser.id })
        .from(appUser)
        .where(and(lowerUsername(next), ne(appUser.id, userId)))
        .limit(1);
      if (clash) throw new ApiError("USERNAME_TAKEN", 409, "El usuario ya está en uso");

      const [alias] = await tx
        .select({ id: usernameAlias.id, userId: usernameAlias.userId })
        .from(usernameAlias)
        .where(lowerAlias(next))
        .limit(1);
      if (alias && alias.userId !== userId) {
        throw new ApiError("USERNAME_TAKEN", 409, "El usuario ya está en uso");
      }
      // Volver a un usuario propio anterior: la reserva se libera.
      if (alias) await tx.delete(usernameAlias).where(eq(usernameAlias.id, alias.id));

      await tx
        .delete(usernameAlias)
        .where(and(eq(usernameAlias.userId, userId), lowerAlias(user.username)));
      await tx.insert(usernameAlias).values({
        userId,
        username: user.username,
        expiresAt: new Date(now.getTime() + USERNAME_CHANGE_COOLDOWN_MS),
      });

      await tx.update(appUser).set({ username: next, usernameChangedAt: now }).where(eq(appUser.id, userId));

      return { username: next, nextChangeAt: new Date(now.getTime() + USERNAME_CHANGE_COOLDOWN_MS) };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError("USERNAME_TAKEN", 409, "El usuario ya está en uso");
    }
    throw error;
  }
}
