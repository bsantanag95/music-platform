import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, artist, comment, rating, recording, releaseGroup, userList } from "@/db/schema";
import { listFeed } from "@/services/feed/feed";
import type { FeedAuthor, FeedComment, FeedEntry, FeedListEvent, FeedRating } from "@/services/feed/feed";
import type { Audience } from "@/services/social/types";

const PUBLIC_PROFILE = eq(appUser.profileVisibility, "public");

const NOT_BLOCKED_SQL = (viewerId: string, authorId: unknown) =>
  sql`NOT EXISTS (
    SELECT 1 FROM user_block b
    WHERE (b.blocker_id = ${viewerId} AND b.blocked_id = ${authorId})
       OR (b.blocker_id = ${authorId} AND b.blocked_id = ${viewerId})
  )`;

function author(id: string, username: string | null, displayName: string | null): FeedAuthor {
  return { id, username: username ?? "", displayName };
}

function targetType(
  artistId: string | null,
  releaseGroupId: string | null,
): "artist" | "release-group" | "recording" {
  return artistId ? "artist" : releaseGroupId ? "release-group" : "recording";
}

/**
 * Preview compacto del feed de seguidos para Inicio: mismo `listFeed` que
 * `/me/feed`, acotado a `limit` entradas, sin paginación.
 */
export async function listFollowingFeedPreview(userId: string, limit = 5): Promise<FeedEntry[]> {
  const { entries } = await listFeed(userId, 1, limit);
  return entries;
}

/**
 * Carátulas para el muro visual del hero anónimo de Inicio: miniaturas de
 * release-groups con arte disponible, más recientes primero. Solo lee
 * `release_group.cover_thumb_url` (thumbnail público de 250px, sin datos de
 * usuario), así que no requiere sesión ni filtra por visibilidad.
 */
export async function listRecentCoverArt(limit = 24): Promise<string[]> {
  const rows = await db
    .select({ coverThumbUrl: releaseGroup.coverThumbUrl })
    .from(releaseGroup)
    .where(isNotNull(releaseGroup.coverThumbUrl))
    .orderBy(desc(releaseGroup.createdAt))
    .limit(limit);

  return rows
    .map((row) => row.coverThumbUrl)
    .filter((url): url is string => Boolean(url));
}

/**
 * Actividad reciente de la comunidad para Inicio: ratings vigentes y
 * comentarios públicos recientes de cualquier usuario con perfil público, sin
 * requerir relación de seguimiento. Si hay `viewerId`, excluye autores
 * bloqueados en cualquier dirección. Sin paginación — pensado para un preview
 * de tamaño fijo, no para una vista completa (ver design.md de
 * add-home-page).
 */
export async function listCommunityActivity(
  viewerId: string | null,
  limit = 10,
): Promise<(FeedRating | FeedComment)[]> {
  const [ratings, comments] = await Promise.all([
    db
      .select({
        id: rating.id,
        stars: rating.stars,
        detailedScore: rating.detailedScore,
        updatedAt: rating.updatedAt,
        artistId: rating.artistId,
        releaseGroupId: rating.releaseGroupId,
        recordingId: rating.recordingId,
        artistName: artist.name,
        releaseTitle: releaseGroup.title,
        releaseCover: releaseGroup.coverThumbUrl,
        recordingTitle: recording.title,
        authorId: rating.userId,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
      })
      .from(rating)
      .innerJoin(appUser, eq(rating.userId, appUser.id))
      .leftJoin(artist, eq(rating.artistId, artist.id))
      .leftJoin(releaseGroup, eq(rating.releaseGroupId, releaseGroup.id))
      .leftJoin(recording, eq(rating.recordingId, recording.id))
      .where(
        viewerId
          ? and(PUBLIC_PROFILE, NOT_BLOCKED_SQL(viewerId, rating.userId))
          : PUBLIC_PROFILE,
      )
      .orderBy(desc(rating.updatedAt), desc(rating.id))
      .limit(limit),

    db
      .select({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        artistId: comment.artistId,
        releaseGroupId: comment.releaseGroupId,
        recordingId: comment.recordingId,
        artistName: artist.name,
        releaseTitle: releaseGroup.title,
        releaseCover: releaseGroup.coverThumbUrl,
        recordingTitle: recording.title,
        authorId: comment.userId,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
      })
      .from(comment)
      .innerJoin(appUser, eq(comment.userId, appUser.id))
      .leftJoin(artist, eq(comment.artistId, artist.id))
      .leftJoin(releaseGroup, eq(comment.releaseGroupId, releaseGroup.id))
      .leftJoin(recording, eq(comment.recordingId, recording.id))
      .where(
        viewerId
          ? and(PUBLIC_PROFILE, NOT_BLOCKED_SQL(viewerId, comment.userId))
          : PUBLIC_PROFILE,
      )
      .orderBy(desc(comment.createdAt), desc(comment.id))
      .limit(limit),
  ]);

  const ratingEntries: FeedRating[] = ratings.map((row) => ({
    kind: "rating" as const,
    id: row.id,
    stars: row.stars,
    detailedScore: row.detailedScore,
    createdAt: row.updatedAt.toISOString(),
    target: {
      type: targetType(row.artistId, row.releaseGroupId),
      id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
      title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
      coverThumbUrl: row.releaseCover,
    },
    author: author(row.authorId, row.authorUsername, row.authorDisplayName),
  }));

  const commentEntries: FeedComment[] = comments.map((row) => ({
    kind: "comment" as const,
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    target: {
      type: targetType(row.artistId, row.releaseGroupId),
      id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
      title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
      coverThumbUrl: row.releaseCover,
    },
    author: author(row.authorId, row.authorUsername, row.authorDisplayName),
  }));

  return [...ratingEntries, ...commentEntries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/**
 * Listas públicas recientes para Inicio: `user_list` con `audience = 'public'`
 * de cualquier usuario con perfil público, sin requerir relación de
 * seguimiento. Si hay `viewerId`, excluye propietarios bloqueados en
 * cualquier dirección. Sin paginación.
 */
export async function listPublicLists(viewerId: string | null, limit = 10): Promise<FeedListEvent[]> {
  const rows = await db
    .select({
      id: userList.id,
      entityType: userList.entityType,
      title: userList.title,
      audience: userList.audience,
      createdAt: userList.createdAt,
      updatedAt: userList.updatedAt,
      authorId: userList.ownerId,
      authorUsername: appUser.username,
      authorDisplayName: appUser.displayName,
    })
    .from(userList)
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(
      viewerId
        ? and(eq(userList.audience, "public"), PUBLIC_PROFILE, NOT_BLOCKED_SQL(viewerId, userList.ownerId))
        : and(eq(userList.audience, "public"), PUBLIC_PROFILE),
    )
    .orderBy(desc(userList.updatedAt), desc(userList.id))
    .limit(limit);

  return rows.map((row) => ({
    kind: "list" as const,
    id: row.id,
    event: row.updatedAt > row.createdAt ? "updated" : "created",
    audience: row.audience as Audience,
    createdAt: row.updatedAt.toISOString(),
    list: {
      id: row.id,
      title: row.title,
      entityType: row.entityType as "artist" | "release-group" | "recording",
    },
    author: author(row.authorId, row.authorUsername, row.authorDisplayName),
  }));
}
