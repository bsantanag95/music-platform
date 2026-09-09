import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { appUser, favorite, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import {
  PROFILE_MAX_ALBUM_FAVORITES,
  replaceAlbumFavorites,
  type AlbumFavorite,
} from "@/services/profiles/album-favorites";

// Onboarding de dos puertas (openspec: add-two-door-onboarding).
// Puerta 1 → Álbumes favoritos del perfil, SIN rating ni entrada de diario.
// Puerta 2 (registrar escucha) usa el flujo de diario existente, no este módulo.
// Este módulo NO importa `rating` a propósito: la Puerta 1 no crea veredictos.

export interface OnboardingState {
  albumFavorites: AlbumFavorite[];
  onboardedAt: string;
}

/**
 * Convierte los álbumes elegidos en la Puerta 1 en Álbumes favoritos del
 * perfil: crea el `favorite` de álbum que falte (audiencia por defecto) y fija
 * el conjunto ordenado con `replaceAlbumFavorites`. No crea `rating` ni
 * `listen_entry`.
 */
export async function seedAlbumFavorites(
  userId: string,
  releaseGroupIds: string[],
): Promise<AlbumFavorite[]> {
  if (releaseGroupIds.length === 0) {
    return replaceAlbumFavorites(userId, []);
  }
  if (releaseGroupIds.length > PROFILE_MAX_ALBUM_FAVORITES) {
    throw new ApiError(
      "VALIDATION_ERROR",
      400,
      `Máximo ${PROFILE_MAX_ALBUM_FAVORITES} álbumes`,
    );
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
    .select({ id: favorite.id, releaseGroupId: favorite.releaseGroupId })
    .from(favorite)
    .where(
      and(eq(favorite.userId, userId), inArray(favorite.releaseGroupId, releaseGroupIds)),
    );
  const favoriteIdByRg = new Map<string, string>(
    owned
      .filter((row): row is { id: string; releaseGroupId: string } => row.releaseGroupId !== null)
      .map((row) => [row.releaseGroupId, row.id]),
  );

  const missing = releaseGroupIds.filter((rgId) => !favoriteIdByRg.has(rgId));
  if (missing.length > 0) {
    const created = await db
      .insert(favorite)
      .values(missing.map((releaseGroupId) => ({ userId, releaseGroupId })))
      .returning({ id: favorite.id, releaseGroupId: favorite.releaseGroupId });
    for (const row of created) {
      if (row.releaseGroupId) favoriteIdByRg.set(row.releaseGroupId, row.id);
    }
  }

  // Orden = orden de elección del usuario.
  const favoriteIds = releaseGroupIds.map((rgId) => favoriteIdByRg.get(rgId)!);
  return replaceAlbumFavorites(userId, favoriteIds);
}

/** Fija `onboarded_at` si estaba nulo. Idempotente. */
export async function markOnboarded(userId: string): Promise<void> {
  await db
    .update(appUser)
    .set({ onboardedAt: new Date() })
    .where(and(eq(appUser.id, userId), isNull(appUser.onboardedAt)));
}

async function readState(userId: string, albumFavorites: AlbumFavorite[]): Promise<OnboardingState> {
  const [row] = await db
    .select({ onboardedAt: appUser.onboardedAt })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  return {
    albumFavorites,
    onboardedAt: (row?.onboardedAt ?? new Date()).toISOString(),
  };
}

/**
 * Cierra el onboarding: siembra los Álbumes favoritos de la Puerta 1 y marca
 * `onboarded_at`. Si el usuario ya estaba onboardeado, no re-siembra ni
 * re-marca — devuelve el estado vigente (idempotente).
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

  if (user.onboardedAt) {
    const { getAlbumFavorites } = await import("@/services/profiles/album-favorites");
    const current = await getAlbumFavorites(userId, ["private", "followers", "public"]);
    return readState(userId, current);
  }

  const albumFavorites = await seedAlbumFavorites(userId, releaseGroupIds);
  await markOnboarded(userId);
  return readState(userId, albumFavorites);
}
