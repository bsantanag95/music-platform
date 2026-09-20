import { and, eq, gt, lt } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/db";
import { appUser, passwordResetToken, session } from "@/db/schema";
import { getEmailTransport } from "@/services/email";
import { buildPasswordResetEmail } from "@/services/email/templates/password-reset";
import { hashPassword, verifyPassword } from "./password";
import { findUserWithPasswordByEmail } from "./users";

/** El link de restablecimiento vence a los 30 minutos (ver ADR 0014). */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Genera y envía un token de restablecimiento si —y solo si— el email
 * corresponde a una cuenta con contraseña local. Para un email inexistente o
 * una cuenta solo-Google es un no-op silencioso, de modo que el llamador pueda
 * responder siempre lo mismo (anti-enumeración).
 *
 * Resuelve el transporte antes de tocar la base para fallar cerrado sin crear
 * tokens cuando no hay proveedor de email configurado en producción.
 */
export async function requestPasswordReset(email: string, locale: string): Promise<void> {
  const transport = getEmailTransport();
  const normalized = email.toLowerCase();
  const user = await findUserWithPasswordByEmail(normalized);
  if (!user || !user.passwordHash) return;

  const token = generateResetToken();
  const tokenHash = hashResetToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS);
  // `uq_password_reset_token_user` garantiza un solo token vigente por usuario:
  // el upsert reemplaza el anterior de forma atómica y race-safe.
  await db
    .insert(passwordResetToken)
    .values({ userId: user.id, tokenHash, createdAt: now, expiresAt })
    .onConflictDoUpdate({
      target: passwordResetToken.userId,
      set: { tokenHash, createdAt: now, expiresAt },
    });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await transport.send(buildPasswordResetEmail({ to: normalized, locale, token, appUrl }));
}

/**
 * Busca un token vigente sin consumirlo (pre-validación de la página de reset).
 * Devuelve además el hash de la contraseña actual para poder rechazar el reuso
 * de la contraseña anterior.
 */
export async function findValidResetToken(
  token: string,
): Promise<{ userId: string; passwordHash: string | null } | null> {
  const [row] = await db
    .select({ userId: passwordResetToken.userId, passwordHash: appUser.passwordHash })
    .from(passwordResetToken)
    .innerJoin(appUser, eq(passwordResetToken.userId, appUser.id))
    .where(
      and(
        eq(passwordResetToken.tokenHash, hashResetToken(token)),
        gt(passwordResetToken.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Consume el token de forma atómica: el `DELETE ... RETURNING` garantiza que
 * dos requests concurrentes con el mismo token solo obtengan una fila.
 */
export async function consumeResetToken(token: string): Promise<{ userId: string } | null> {
  const [row] = await db
    .delete(passwordResetToken)
    .where(
      and(
        eq(passwordResetToken.tokenHash, hashResetToken(token)),
        gt(passwordResetToken.expiresAt, new Date()),
      ),
    )
    .returning({ userId: passwordResetToken.userId });
  return row ?? null;
}

export type ResetPasswordResult = "ok" | "invalid_token" | "password_reused";

/**
 * Fija la contraseña nueva a partir de un token válido.
 *
 * Orden: valida el token sin consumirlo, rechaza reusar la contraseña actual
 * (sin consumir el token, para que el usuario reintente con el mismo link),
 * calcula el hash y recién entonces consume el token de forma atómica. Los
 * cambios se aplican en una transacción: contraseña + borrado de todos los
 * tokens y de todas las sesiones del usuario (sin autologin).
 */
export async function resetPassword(
  token: string,
  password: string,
): Promise<ResetPasswordResult> {
  const valid = await findValidResetToken(token);
  if (!valid) return "invalid_token";
  if (await verifyPassword(valid.passwordHash, password)) return "password_reused";

  const passwordHash = await hashPassword(password);
  const consumed = await consumeResetToken(token);
  if (!consumed) return "invalid_token";

  await db.transaction(async (tx) => {
    await tx.update(appUser).set({ passwordHash }).where(eq(appUser.id, consumed.userId));
    await tx.delete(passwordResetToken).where(eq(passwordResetToken.userId, consumed.userId));
    await tx.delete(session).where(eq(session.userId, consumed.userId));
  });
  return "ok";
}

export async function cleanupExpiredResetTokens(): Promise<void> {
  await db.delete(passwordResetToken).where(lt(passwordResetToken.expiresAt, new Date()));
}
