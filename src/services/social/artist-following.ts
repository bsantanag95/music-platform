import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, artistFollow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";

// Seguir artista — relación unilateral usuario → artista
// (openspec: add-artist-following). Sin aprobación, idempotente en ambos
// sentidos. Distinta de `favorite` de artista (gusto declarado) y de
// `user_follow`. En esta fase: señal de afinidad / descubrimiento /
// organización personal. Sin notificaciones de lanzamiento.

export interface FollowedArtist {
  id: string;
  name: string;
  type: string;
  photoUrl: string | null;
}

async function assertArtistExists(artistId: string): Promise<void> {
  const [row] = await db
    .select({ id: artist.id })
    .from(artist)
    .where(eq(artist.id, artistId))
    .limit(1);
  if (!row) throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista no existe");
}

export async function followArtist(
  userId: string,
  artistId: string,
): Promise<{ following: true }> {
  await assertArtistExists(artistId);
  await db
    .insert(artistFollow)
    .values({ userId, artistId })
    .onConflictDoNothing({ target: [artistFollow.userId, artistFollow.artistId] });
  return { following: true };
}

export async function unfollowArtist(
  userId: string,
  artistId: string,
): Promise<{ following: false }> {
  await db
    .delete(artistFollow)
    .where(and(eq(artistFollow.userId, userId), eq(artistFollow.artistId, artistId)));
  return { following: false };
}

export async function isFollowingArtist(
  userId: string,
  artistId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: artistFollow.id })
    .from(artistFollow)
    .where(and(eq(artistFollow.userId, userId), eq(artistFollow.artistId, artistId)))
    .limit(1);
  return Boolean(row);
}

const FOLLOWED_SELECT = {
  id: artist.id,
  name: artist.name,
  type: artist.type,
  photoUrl: artist.photoUrl,
} as const;

export async function listFollowedArtists(
  userId: string,
  page = 1,
  pageSize = 50,
): Promise<{ artists: FollowedArtist[]; page: number; pageSize: number; hasNext: boolean }> {
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  const rows = await db
    .select(FOLLOWED_SELECT)
    .from(artistFollow)
    .innerJoin(artist, eq(artist.id, artistFollow.artistId))
    .where(eq(artistFollow.userId, userId))
    .orderBy(desc(artistFollow.createdAt), desc(artistFollow.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  return {
    artists: rows.slice(0, pageSize),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

export async function countFollowedArtists(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(artistFollow)
    .where(eq(artistFollow.userId, userId));
  return row?.n ?? 0;
}

/** Artistas que `userId` sigue de entre `artistIds` (para la afinidad). */
export async function followedArtistIdsWithin(
  userId: string,
  artistIds: string[],
): Promise<Set<string>> {
  if (artistIds.length === 0) return new Set();
  const rows = await db
    .select({ artistId: artistFollow.artistId })
    .from(artistFollow)
    .where(and(eq(artistFollow.userId, userId), inArray(artistFollow.artistId, artistIds)));
  return new Set(rows.map((r) => r.artistId));
}
