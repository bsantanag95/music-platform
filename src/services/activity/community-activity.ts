// Actividad reciente de la comunidad (cambio add-community-activity-surface):
// ratings vigentes, comentarios y reseñas de álbum de cualquier usuario con
// perfil público, sin requerir relación de seguimiento. Alimenta la sección
// "Recientes" de `/activity` y el preview de tamaño fijo de Inicio.
//
// Composición heterogénea (tres fuentes) paginada por fusión en memoria: mismo
// patrón que `listFeed` en `src/services/feed/feed.ts` — cada fuente se
// consulta con `LIMIT pageSize + 1` sin offset propio, se fusionan, se ordenan
// por fecha y se recorta la página pedida. Se degrada con volumen alto en
// páginas profundas; aceptado igual que en `listFeed` (ver su comentario).

import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, artist, comment, rating, recording, releaseGroup, review } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { FeedAuthor, FeedComment, FeedRating, FeedReview } from "@/services/feed/feed";

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

export interface CommunityActivityPage {
  entries: (FeedRating | FeedComment | FeedReview)[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export async function listCommunityActivity(
  viewerId: string | null,
  page = 1,
  pageSize = 10,
): Promise<CommunityActivityPage> {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  const visibility = (authorColumn: unknown) =>
    viewerId ? and(PUBLIC_PROFILE, NOT_BLOCKED_SQL(viewerId, authorColumn)) : PUBLIC_PROFILE;

  const perSource = pageSize + 1;

  const [ratings, comments, reviews] = await Promise.all([
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
      .where(visibility(rating.userId))
      .orderBy(desc(rating.updatedAt), desc(rating.id))
      .limit(perSource),

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
      .where(visibility(comment.userId))
      .orderBy(desc(comment.createdAt), desc(comment.id))
      .limit(perSource),

    db
      .select({
        id: review.id,
        title: review.title,
        body: review.body,
        updatedAt: review.updatedAt,
        artistId: review.artistId,
        releaseGroupId: review.releaseGroupId,
        recordingId: review.recordingId,
        artistName: artist.name,
        releaseTitle: releaseGroup.title,
        releaseCover: releaseGroup.coverThumbUrl,
        recordingTitle: recording.title,
        authorId: review.userId,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
      })
      .from(review)
      .innerJoin(appUser, eq(review.userId, appUser.id))
      .leftJoin(artist, eq(review.artistId, artist.id))
      .leftJoin(releaseGroup, eq(review.releaseGroupId, releaseGroup.id))
      .leftJoin(recording, eq(review.recordingId, recording.id))
      .where(visibility(review.userId))
      .orderBy(desc(review.updatedAt), desc(review.id))
      .limit(perSource),
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
      // El bloque compacto de Inicio no muestra el artista; el feed sí (vía
      // listFeed). Acá queda null a propósito, igual que antes de generalizar.
      artistName: null,
      artistId: null,
      // Esta fuente no alimenta la detección de "barrido de álbum" (solo
      // `listFeed`/`listMyRecentActivity` la usan) — null a propósito.
      albumId: null,
      albumTitle: null,
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
      artistName: null,
      artistId: null,
      coverThumbUrl: row.releaseCover,
    },
    author: author(row.authorId, row.authorUsername, row.authorDisplayName),
  }));

  const reviewEntries: FeedReview[] = reviews.map((row) => ({
    kind: "review" as const,
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.updatedAt.toISOString(),
    target: {
      type: targetType(row.artistId, row.releaseGroupId),
      id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
      title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
      artistName: null,
      artistId: null,
      coverThumbUrl: row.releaseCover,
    },
    author: author(row.authorId, row.authorUsername, row.authorDisplayName),
  }));

  const extra = 1;
  const merged = [...ratingEntries, ...commentEntries, ...reviewEntries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice((page - 1) * pageSize, page * pageSize + extra);

  return {
    entries: merged.slice(0, pageSize),
    page,
    pageSize,
    hasNext: merged.length > pageSize,
  };
}
