import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { favorite, releaseGroup, userAlbumPin } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { PRIMARY_ARTIST_SQL } from "@/services/feed/feed";
import { audiencesForProfile } from "@/services/social/visibility";
import { PROFILE_MAX_ALBUM_FAVORITES, type Audience } from "@/services/social/types";

export { PROFILE_MAX_ALBUM_FAVORITES };

export interface AlbumFavorite {
  id: string; // id de la fila user_album_pin
  favoriteId: string;
  position: number;
  target: {
    id: string; // release_group id
    title: string;
    artistName: string | null;
    coverThumbUrl: string | null;
  };
}

const PIN_SELECT = {
  id: userAlbumPin.id,
  favoriteId: userAlbumPin.favoriteId,
  position: userAlbumPin.position,
  releaseGroupId: favorite.releaseGroupId,
  title: releaseGroup.title,
  coverThumbUrl: releaseGroup.coverThumbUrl,
  artistName: PRIMARY_ARTIST_SQL(favorite.releaseGroupId, favorite.recordingId),
} as const;

/**
 * Álbumes favoritos fijados del dueño, filtrados por la audiencia del favorito
 * subyacente según lo que el visitante tiene permitido ver (OQ1: la sección
 * respeta la audiencia del favorito, no muestra menos filtrado que él).
 */
export async function getAlbumFavorites(
  ownerId: string,
  audiences: Audience[],
): Promise<AlbumFavorite[]> {
  if (audiences.length === 0) return [];

  const rows = await db
    .select(PIN_SELECT)
    .from(userAlbumPin)
    .innerJoin(favorite, eq(favorite.id, userAlbumPin.favoriteId))
    .innerJoin(releaseGroup, eq(releaseGroup.id, favorite.releaseGroupId))
    .where(
      and(
        eq(userAlbumPin.userId, ownerId),
        isNotNull(favorite.releaseGroupId),
        inArray(favorite.audience, audiences),
      ),
    )
    .orderBy(asc(userAlbumPin.position));

  return rows.map((row) => ({
    id: row.id,
    favoriteId: row.favoriteId,
    position: row.position,
    target: {
      id: row.releaseGroupId!,
      title: row.title,
      artistName: row.artistName,
      coverThumbUrl: row.coverThumbUrl,
    },
  }));
}

/**
 * Álbumes favoritos de un perfil para un lector: resuelve el perfil, computa
 * las audiencias visibles y devuelve la sección filtrada. El propio dueño
 * (relation `self`) ve todos.
 */
export async function getProfileAlbumFavorites(
  username: string,
  viewerId: string | null,
): Promise<AlbumFavorite[]> {
  const { getProfileByUsername } = await import("@/services/social/profiles");
  const profile = await getProfileByUsername(username, viewerId);
  if (!profile.accessible) return [];
  return getAlbumFavorites(profile.id, audiencesForProfile(profile) as Audience[]);
}

/**
 * Reemplaza el conjunto ordenado de álbumes favoritos del dueño. Cada id SHALL
 * ser un `favorite` propio con objetivo de álbum. Máx 6. Transaccional.
 */
export async function replaceAlbumFavorites(
  ownerId: string,
  favoriteIds: string[],
): Promise<AlbumFavorite[]> {
  if (favoriteIds.length > PROFILE_MAX_ALBUM_FAVORITES) {
    throw new ApiError(
      "VALIDATION_ERROR",
      400,
      `Máximo ${PROFILE_MAX_ALBUM_FAVORITES} álbumes favoritos`,
    );
  }
  if (new Set(favoriteIds).size !== favoriteIds.length) {
    throw new ApiError("VALIDATION_ERROR", 400, "No se puede fijar el mismo favorito dos veces");
  }

  if (favoriteIds.length > 0) {
    const valid = await db
      .select({ id: favorite.id })
      .from(favorite)
      .where(
        and(
          inArray(favorite.id, favoriteIds),
          eq(favorite.userId, ownerId),
          isNotNull(favorite.releaseGroupId),
        ),
      );
    if (valid.length !== favoriteIds.length) {
      throw new ApiError(
        "VALIDATION_ERROR",
        400,
        "Solo se pueden fijar favoritos de álbum propios",
      );
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(userAlbumPin).where(eq(userAlbumPin.userId, ownerId));
    if (favoriteIds.length === 0) return;
    await tx.insert(userAlbumPin).values(
      favoriteIds.map((favoriteId, index) => ({
        userId: ownerId,
        favoriteId,
        position: index + 1,
      })),
    );
  });

  return getAlbumFavorites(ownerId, ["private", "followers", "public"]);
}
