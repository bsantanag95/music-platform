import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { appUser, favorite, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { ONBOARDING_MAX_ALBUMS } from "@/services/social/types";

// Onboarding de dos puertas (openspec: add-two-door-onboarding).
// Puerta 1 → favoritos de álbum del usuario, SIN rating ni entrada de diario.
// Puerta 2 (registrar escucha) usa el flujo de diario existente, no este módulo.
// Este módulo NO importa `rating` a propósito: la Puerta 1 no crea veredictos.

export interface OnboardingState {
  onboardedAt: string;
}

/**
 * Convierte los álbumes elegidos en la Puerta 1 en favoritos de álbum del
 * usuario: crea el `favorite` que falte (audiencia por defecto de un favorito
 * nuevo) y deja intacto el que ya existía. No fija ni ordena nada (openspec:
 * simplify-profile-curation) y no crea `rating` ni `listen_entry`.
 */
export async function seedFavoriteAlbums(userId: string, releaseGroupIds: string[]): Promise<void> {
  if (releaseGroupIds.length === 0) return;
  if (releaseGroupIds.length > ONBOARDING_MAX_ALBUMS) {
    throw new ApiError("VALIDATION_ERROR", 400, `Máximo ${ONBOARDING_MAX_ALBUMS} álbumes`);
  }
  if (new Set(releaseGroupIds).size !== releaseGroupIds.length) {
    throw new ApiError("VALIDATION_ERROR", 400, "No se puede elegir el mismo álbum dos veces");
  }

  const existingAlbums = await db
    .select({ id: releaseGroup.id })
    .from(releaseGroup)
    .where(inArray(releaseGroup.id, releaseGroupIds));
  if (existingAlbums.length !== releaseGroupIds.length) {
    throw new ApiError("VALIDATION_ERROR", 400, "Alguno de los álbumes no existe");
  }

  // Favoritos de álbum propios ya existentes para estos release-groups.
  const owned = await db
    .select({ releaseGroupId: favorite.releaseGroupId })
    .from(favorite)
    .where(and(eq(favorite.userId, userId), inArray(favorite.releaseGroupId, releaseGroupIds)));
  const alreadyFavorite = new Set(owned.map((row) => row.releaseGroupId));

  const missing = releaseGroupIds.filter((rgId) => !alreadyFavorite.has(rgId));
  if (missing.length > 0) {
    await db.insert(favorite).values(missing.map((releaseGroupId) => ({ userId, releaseGroupId })));
  }
}

/** Fija `onboarded_at` si estaba nulo. Idempotente. */
export async function markOnboarded(userId: string): Promise<void> {
  await db
    .update(appUser)
    .set({ onboardedAt: new Date() })
    .where(and(eq(appUser.id, userId), isNull(appUser.onboardedAt)));
}

async function readState(userId: string): Promise<OnboardingState> {
  const [row] = await db
    .select({ onboardedAt: appUser.onboardedAt })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  return { onboardedAt: (row?.onboardedAt ?? new Date()).toISOString() };
}

/**
 * Cierra el onboarding: crea los favoritos de álbum de la Puerta 1 y marca
 * `onboarded_at`. Si el usuario ya estaba onboardeado, no vuelve a crear ni a
 * marcar — devuelve el estado vigente (idempotente).
 */
export async function completeOnboarding(
  userId: string,
  releaseGroupIds: string[],
): Promise<OnboardingState> {
  const [user] = await db
    .select({ onboardedAt: appUser.onboardedAt })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  if (!user) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");

  if (user.onboardedAt) return readState(userId);

  await seedFavoriteAlbums(userId, releaseGroupIds);
  await markOnboarded(userId);
  return readState(userId);
}
