import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUser, authIdentity, type AppUserRow } from "@/db/schema";
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
