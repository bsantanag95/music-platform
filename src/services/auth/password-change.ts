import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { appUser, passwordResetToken } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { getEmailTransport } from "@/services/email";
import { buildPasswordChangedEmail } from "@/services/email/templates/password-changed";
import { hashPassword, verifyPassword } from "./password";
import { requireRecentAuth } from "./recent-auth";
import { deleteOtherSessions, type ResolvedSession } from "./sessions";

// Cambiar y crear la contraseña desde Ajustes (spec account-credentials). El
// hash nunca sale de acá: los llamadores solo saben si hay contraseña o no.

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  /** Cierra todas las sesiones salvo la actual. */
  revokeOtherSessions: boolean;
  locale: string;
}

// Aviso por correo, best-effort: un transporte caído no debe deshacer un cambio
// que ya se aplicó, y en desarrollo el adaptador `console` lo imprime.
async function sendPasswordChangedNotice(email: string, locale: string): Promise<void> {
  try {
    await getEmailTransport().send(buildPasswordChangedEmail({ to: email, locale }));
  } catch (error) {
    console.error("No se pudo avisar del cambio de contraseña:", error);
  }
}

/**
 * Cambia la contraseña de una cuenta que ya tiene una. Exige la actual (vía
 * `requireRecentAuth`, con su límite de intentos), rechaza repetirla, invalida
 * los tokens de restablecimiento pendientes y, si se pide, cierra las demás
 * sesiones.
 */
export async function changePassword(current: ResolvedSession, input: ChangePasswordInput): Promise<void> {
  const { user } = current;
  if (user.passwordHash === null) {
    throw new ApiError("VALIDATION_ERROR", 400, "Tu cuenta no tiene contraseña: creá una");
  }

  await requireRecentAuth(current, input.currentPassword);

  if (await verifyPassword(user.passwordHash, input.newPassword)) {
    throw new ApiError("PASSWORD_REUSED", 400, "La contraseña nueva es igual a la actual");
  }

  const passwordHash = await hashPassword(input.newPassword);
  await db.transaction(async (tx) => {
    await tx.update(appUser).set({ passwordHash }).where(eq(appUser.id, user.id));
    await tx.delete(passwordResetToken).where(eq(passwordResetToken.userId, user.id));
  });

  if (input.revokeOtherSessions) await deleteOtherSessions(user.id, current.sessionId);
  await sendPasswordChangedNotice(user.email, input.locale);
}

/**
 * Crea la contraseña de una cuenta que no tiene (alta con Google), con el
 * factor de "Autenticación reciente". El `WHERE password_hash IS NULL` evita
 * pisar una contraseña creada en paralelo.
 */
export async function createPassword(
  current: ResolvedSession,
  input: { newPassword: string; locale: string },
): Promise<void> {
  const { user } = current;
  if (user.passwordHash !== null) {
    throw new ApiError("VALIDATION_ERROR", 400, "Tu cuenta ya tiene contraseña: cambiala");
  }

  await requireRecentAuth(current);

  const passwordHash = await hashPassword(input.newPassword);
  const updated = await db
    .update(appUser)
    .set({ passwordHash })
    .where(and(eq(appUser.id, user.id), isNull(appUser.passwordHash)))
    .returning({ id: appUser.id });
  if (updated.length === 0) {
    throw new ApiError("VALIDATION_ERROR", 400, "Tu cuenta ya tiene contraseña: cambiala");
  }

  await sendPasswordChangedNotice(user.email, input.locale);
}
