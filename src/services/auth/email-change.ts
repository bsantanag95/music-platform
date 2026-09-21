import { and, eq, gt, ne } from "drizzle-orm";
import { db } from "@/db";
import { appUser, emailChangeToken, emailVerificationToken } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { getEmailTransport } from "@/services/email";
import {
  buildEmailChangeConfirmEmail,
  buildEmailChangeNoticeEmail,
} from "@/services/email/templates/email-change";
import { generateVerificationToken, hashVerificationToken } from "./email-verification";
import { requireRecentAuth } from "./recent-auth";
import type { ResolvedSession } from "./sessions";

// Cambio de email con confirmación por correo (spec account-credentials). El
// email actual NO cambia hasta que la persona confirma el correo nuevo; un
// pedido nuevo reemplaza al pendiente; el token es de un solo uso (borrado
// físico), guarda solo su hash y vence a las 24 horas.

/** El enlace de confirmación vence a las 24 horas. */
export const EMAIL_CHANGE_TTL_MS = 24 * 60 * 60 * 1000;

function isUniqueViolation(error: unknown): error is { code: "23505" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export interface RequestEmailChangeInput {
  newEmail: string;
  /** Contraseña actual; obligatoria en cuentas con contraseña. */
  password?: string;
  locale: string;
}

/**
 * Pide el cambio de email: factor de identidad, validaciones y correo de
 * confirmación al email NUEVO. Falla cerrado: si el envío falla no queda un
 * token vigente. Un transporte no configurado propaga `EmailConfigError`.
 */
export async function requestEmailChange(
  current: ResolvedSession,
  input: RequestEmailChangeInput,
): Promise<void> {
  // Primero el transporte: sin él no tiene sentido gastar un intento de contraseña.
  const transport = getEmailTransport();
  await requireRecentAuth(current, input.password);

  const newEmail = input.newEmail.trim().toLowerCase();
  if (newEmail === current.user.email.toLowerCase()) {
    throw new ApiError("VALIDATION_ERROR", 400, "Ese ya es el email de tu cuenta");
  }

  const [taken] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.email, newEmail))
    .limit(1);
  if (taken) throw new ApiError("EMAIL_TAKEN", 409, "El email ya está en uso");

  const token = generateVerificationToken();
  const tokenHash = hashVerificationToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMAIL_CHANGE_TTL_MS);
  await db
    .insert(emailChangeToken)
    .values({ userId: current.user.id, newEmail, tokenHash, createdAt: now, expiresAt })
    .onConflictDoUpdate({
      target: emailChangeToken.userId,
      set: { newEmail, tokenHash, createdAt: now, expiresAt },
    });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    await transport.send(buildEmailChangeConfirmEmail({ to: newEmail, locale: input.locale, token, appUrl }));
  } catch (error) {
    await db
      .delete(emailChangeToken)
      .where(and(eq(emailChangeToken.userId, current.user.id), eq(emailChangeToken.tokenHash, tokenHash)));
    throw error;
  }
}

/** Cambio de email pendiente de la persona (para avisarlo en Ajustes), o `null`. */
export async function getPendingEmailChange(
  userId: string,
): Promise<{ newEmail: string; expiresAt: Date } | null> {
  const [row] = await db
    .select({ newEmail: emailChangeToken.newEmail, expiresAt: emailChangeToken.expiresAt })
    .from(emailChangeToken)
    .where(and(eq(emailChangeToken.userId, userId), gt(emailChangeToken.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

/** Busca un token vigente sin consumirlo (pre-validación de la página de confirmación). */
export async function findValidEmailChangeToken(token: string): Promise<{ newEmail: string } | null> {
  const [row] = await db
    .select({ newEmail: emailChangeToken.newEmail })
    .from(emailChangeToken)
    .where(
      and(eq(emailChangeToken.tokenHash, hashVerificationToken(token)), gt(emailChangeToken.expiresAt, new Date())),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Confirma el cambio desde el enlace del correo. Todo en una transacción: el
 * `DELETE ... RETURNING` consume el token (dos peticiones concurrentes solo
 * obtienen una fila), se revalida que el email siga libre, se actualiza el
 * email como verificado y se descartan los tokens de verificación pendientes.
 * Si algo falla la transacción se deshace y el token sigue vigente. Después
 * avisa al email anterior (best-effort).
 */
export async function confirmEmailChange(token: string, locale: string): Promise<{ email: string }> {
  let result: { previousEmail: string; email: string };
  try {
    result = await db.transaction(async (tx) => {
      const [row] = await tx
        .delete(emailChangeToken)
        .where(
          and(
            eq(emailChangeToken.tokenHash, hashVerificationToken(token)),
            gt(emailChangeToken.expiresAt, new Date()),
          ),
        )
        .returning({ userId: emailChangeToken.userId, newEmail: emailChangeToken.newEmail });
      if (!row) throw new ApiError("INVALID_VERIFICATION_TOKEN", 400, "El link no es válido o expiró");

      const [user] = await tx
        .select({ email: appUser.email })
        .from(appUser)
        .where(eq(appUser.id, row.userId))
        .limit(1);
      if (!user) throw new ApiError("INVALID_VERIFICATION_TOKEN", 400, "El link no es válido o expiró");

      const [clash] = await tx
        .select({ id: appUser.id })
        .from(appUser)
        .where(and(eq(appUser.email, row.newEmail), ne(appUser.id, row.userId)))
        .limit(1);
      if (clash) throw new ApiError("EMAIL_TAKEN", 409, "El email ya está en uso");

      await tx
        .update(appUser)
        .set({ email: row.newEmail, emailVerifiedAt: new Date() })
        .where(eq(appUser.id, row.userId));
      await tx.delete(emailVerificationToken).where(eq(emailVerificationToken.userId, row.userId));

      return { previousEmail: user.email, email: row.newEmail };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApiError("EMAIL_TAKEN", 409, "El email ya está en uso");
    throw error;
  }

  // El aviso al email anterior no debe deshacer un cambio ya confirmado.
  try {
    await getEmailTransport().send(
      buildEmailChangeNoticeEmail({ to: result.previousEmail, locale, newEmail: result.email }),
    );
  } catch (error) {
    console.error("No se pudo avisar al email anterior del cambio de email:", error);
  }

  return { email: result.email };
}
