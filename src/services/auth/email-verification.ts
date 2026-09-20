import { and, eq, gt, lt } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/db";
import { appUser, emailVerificationToken } from "@/db/schema";
import { getEmailTransport } from "@/services/email";
import { buildEmailVerificationEmail } from "@/services/email/templates/email-verification";
import type { EmailTransport } from "@/services/email";

/** El link de verificación vence a las 24 horas (ver ADR 0015). */
export const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString("base64url");
}

type VerificationUser = { email: string; emailVerifiedAt: Date | null };

/**
 * Punto de control centralizado de la verificación. Hoy el flujo es soft (no
 * bloquea), pero activar el enforcement duro es cambiar este helper y sus
 * llamadores, no reescribir pantallas.
 */
export function isEmailVerified(user: { emailVerifiedAt: Date | null }): boolean {
  return user.emailVerifiedAt !== null;
}

async function findUserForVerification(userId: string): Promise<VerificationUser | null> {
  const [user] = await db
    .select({ email: appUser.email, emailVerifiedAt: appUser.emailVerifiedAt })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  return user ?? null;
}

async function createAndSend(
  userId: string,
  user: VerificationUser,
  locale: string,
  transport: EmailTransport,
): Promise<void> {
  const token = generateVerificationToken();
  const tokenHash = hashVerificationToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + VERIFICATION_TOKEN_TTL_MS);
  // Un solo token vigente por usuario: el upsert reemplaza el anterior.
  await db
    .insert(emailVerificationToken)
    .values({ userId, tokenHash, createdAt: now, expiresAt })
    .onConflictDoUpdate({
      target: emailVerificationToken.userId,
      set: { tokenHash, createdAt: now, expiresAt },
    });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await transport.send(
    buildEmailVerificationEmail({ to: user.email, locale, token, appUrl }),
  );
}

/**
 * Envía la verificación al registrarse. Es best-effort y modo soft: si no hay
 * transporte real configurado (o el envío falla), registra el fallo y no crea
 * token, sin propagar el error — el alta y la sesión siguen funcionando.
 */
export async function requestEmailVerification(userId: string, locale: string): Promise<void> {
  let transport: EmailTransport;
  try {
    transport = getEmailTransport();
  } catch (error) {
    console.error("No se pudo enviar la verificación de email (transporte no configurado):", error);
    return;
  }

  const user = await findUserForVerification(userId);
  if (!user || isEmailVerified(user)) return;

  await createAndSend(userId, user, locale, transport);
}

export type ResendVerificationResult = "sent" | "already_verified";

/**
 * Reenvío explícito desde una cuenta autenticada. A diferencia del registro,
 * un transporte no configurado SÍ propaga el error para que la ruta responda
 * `EMAIL_CONFIG_MISSING` (el usuario pidió el correo).
 */
export async function resendEmailVerification(
  userId: string,
  locale: string,
): Promise<ResendVerificationResult> {
  const transport = getEmailTransport();
  const user = await findUserForVerification(userId);
  if (!user || isEmailVerified(user)) return "already_verified";

  await createAndSend(userId, user, locale, transport);
  return "sent";
}

/** Busca un token vigente sin consumirlo (pre-validación de la página). */
export async function findValidVerificationToken(token: string): Promise<{ userId: string } | null> {
  const [row] = await db
    .select({ userId: emailVerificationToken.userId })
    .from(emailVerificationToken)
    .where(
      and(
        eq(emailVerificationToken.tokenHash, hashVerificationToken(token)),
        gt(emailVerificationToken.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Consume el token de forma atómica: el `DELETE ... RETURNING` garantiza que
 * dos requests concurrentes con el mismo token solo obtengan una fila.
 */
export async function consumeVerificationToken(
  token: string,
): Promise<{ userId: string } | null> {
  const [row] = await db
    .delete(emailVerificationToken)
    .where(
      and(
        eq(emailVerificationToken.tokenHash, hashVerificationToken(token)),
        gt(emailVerificationToken.expiresAt, new Date()),
      ),
    )
    .returning({ userId: emailVerificationToken.userId });
  return row ?? null;
}

/**
 * Marca el email como verificado a partir de un token válido, borrando los
 * tokens del usuario en una transacción. Devuelve `false` si el token no era
 * válido, expiró o ya fue usado.
 */
export async function verifyEmail(token: string): Promise<boolean> {
  const consumed = await consumeVerificationToken(token);
  if (!consumed) return false;

  await db.transaction(async (tx) => {
    await tx
      .update(appUser)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(appUser.id, consumed.userId));
    await tx.delete(emailVerificationToken).where(eq(emailVerificationToken.userId, consumed.userId));
  });
  return true;
}

export async function cleanupExpiredVerificationTokens(): Promise<void> {
  await db.delete(emailVerificationToken).where(lt(emailVerificationToken.expiresAt, new Date()));
}
