import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser, authIdentity, type AppUserRow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { ExternalIdentity } from "./providers";
import { findAvailableUsername, findUserByEmail } from "./users";

function isUniqueViolation(error: unknown): error is { code: "23505" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export async function findIdentityByProvider(
  provider: string,
  providerAccountId: string,
): Promise<{ user: AppUserRow } | null> {
  const [row] = await db
    .select({ user: appUser })
    .from(authIdentity)
    .innerJoin(appUser, eq(authIdentity.userId, appUser.id))
    .where(
      and(
        eq(authIdentity.provider, provider),
        eq(authIdentity.providerAccountId, providerAccountId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function resolveOrCreateOAuthUser(identity: ExternalIdentity): Promise<AppUserRow> {
  const existing = await findIdentityByProvider(identity.provider, identity.providerAccountId);
  if (existing) return existing.user;

  if (!identity.email) {
    throw new Error("OAUTH_EMAIL_REQUIRED");
  }

  if (!identity.emailVerified) {
    throw new Error("OAUTH_EMAIL_NOT_VERIFIED");
  }

  const localUser = await findUserByEmail(identity.email);
  if (localUser) {
    throw new Error("EMAIL_TAKEN_BY_LOCAL");
  }

  const base = identity.email.split("@")[0]!;
  const email = identity.email.toLowerCase();

  // Reintenta la creación transaccional ante colisiones de username por carrera
  // (TOCTOU entre findAvailableUsername y el insert).
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = await findAvailableUsername(base);

    try {
      return await db.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(appUser)
          .values({
            username,
            email,
            displayName: identity.displayName ?? null,
            passwordHash: null,
            // El flujo ya exigió email_verified=true para crear la cuenta.
            emailVerifiedAt: new Date(),
          })
          .returning();

        if (!newUser) throw new Error("No se pudo crear el usuario");

        await tx.insert(authIdentity).values({
          userId: newUser.id,
          provider: identity.provider,
          providerAccountId: identity.providerAccountId,
        });

        return newUser;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        const identityRow = await findIdentityByProvider(identity.provider, identity.providerAccountId);
        if (identityRow) return identityRow.user;
        // Colisión de email: el usuario local se creó entre la comprobación y el insert.
        const emailOwner = await findUserByEmail(identity.email);
        if (emailOwner) throw new Error("EMAIL_TAKEN_BY_LOCAL");
        // Colisión de username: probar con el siguiente sufijo.
        continue;
      }
      throw error;
    }
  }

  throw new Error("USERNAME_TAKEN");
}

/**
 * Vincula una identidad externa a una cuenta ya autenticada (spec
 * account-credentials, "Vincular Google a la cuenta"). La identidad se enlaza
 * por el identificador de la cuenta externa, NUNCA por el email: el email de
 * Google no tiene que coincidir con el de la cuenta y no concede nada al dueño
 * de ese email. Una identidad ya vinculada a OTRA cuenta se rechaza; volver a
 * vincular la propia es inocuo.
 */
export async function linkIdentityToUser(userId: string, identity: ExternalIdentity): Promise<void> {
  const existing = await findIdentityByProvider(identity.provider, identity.providerAccountId);
  if (existing) {
    if (existing.user.id === userId) return;
    throw new Error("OAUTH_IDENTITY_TAKEN");
  }

  try {
    await db.insert(authIdentity).values({
      userId,
      provider: identity.provider,
      providerAccountId: identity.providerAccountId,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new Error("OAUTH_IDENTITY_TAKEN");
    throw error;
  }
}

/** Quita las identidades de un proveedor de la cuenta (desvincular). Devuelve cuántas borró. */
export async function unlinkProvider(userId: string, provider: string): Promise<number> {
  const deleted = await db
    .delete(authIdentity)
    .where(and(eq(authIdentity.userId, userId), eq(authIdentity.provider, provider)))
    .returning({ id: authIdentity.id });
  return deleted.length;
}

/**
 * Desvincula Google de la cuenta (spec account-credentials, "Desvincular Google
 * sin perder el acceso"). Solo si la cuenta tiene contraseña local: si Google es
 * su único método de acceso se rechaza con `LAST_ACCESS_METHOD` y no cambia nada.
 */
export async function unlinkGoogle(userId: string): Promise<void> {
  const [user] = await db
    .select({ passwordHash: appUser.passwordHash })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  if (!user) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");
  if (user.passwordHash === null) {
    throw new ApiError("LAST_ACCESS_METHOD", 409, "Google es tu único método de acceso");
  }
  await unlinkProvider(userId, "google");
}

