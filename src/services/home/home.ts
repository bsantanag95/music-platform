import { and, asc, count, desc, eq, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { ApiError } from "@/lib/api/errors";
import {
  appUser,
  artist,
  artistFollow,
  collectionEntry,
  comment,
  listenEntry,
  rating,
  recording,
  releaseGroup,
  review,
  userFollow,
  userList,
  userListItem,
  wantedEntry,
} from "@/db/schema";
import {
  caminoBaseConditions,
  caminoCompletedFeedQuery,
  caminoCreatedFeedQuery,
  caminoFeedEntries,
  collectionFeedEntry,
  collectionFeedQuery,
  wantedFeedEntry,
  wantedFeedQuery,
  PRIMARY_ARTIST_ID_SQL,
  PRIMARY_ARTIST_SQL,
  RECORDING_ALBUM_ID_SQL,
  RECORDING_ALBUM_TITLE_SQL,
} from "@/services/feed/feed";
import type {
  FeedAuthor,
  FeedCamino,
  FeedCollection,
  FeedComment,
  FeedFollow,
  FeedFollowArtist,
  FeedListEvent,
  FeedListenEntry,
  FeedRating,
  FeedReview,
  FeedWanted,
} from "@/services/feed/feed";
import type { Audience } from "@/services/social/types";
import { activeUserCondition } from "@/services/auth/account-status";
import { COMMENT_LIKE_COUNT_SQL, thresholdedLikeCount } from "@/services/social/comment-likes";

// Perfil público Y cuenta activa: una cuenta desactivada no aparece en Home.
const PUBLIC_PROFILE = and(eq(appUser.profileVisibility, "public"), activeUserCondition());

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
 * "Tu rastro reciente" de Inicio: las escuchas, valoraciones, comentarios,
 * reseñas, seguimientos, altas de colección y de wishlist y Caminos más
 * recientes del propio usuario, como recap de presencia. No filtra por
 * audiencia —es contenido propio, igual que `/me/diary`— ni por bloqueos.
 * Pagina igual que `listFeed`: cada fuente se trae ampliada
 * (`pageSize + extra`), se fusiona en memoria y se recorta por página — la
 * composición heterogénea no permite paginación SQL única (ver
 * `openspec/changes/archive/*-redesign-feed/design.md`).
 */
export async function listMyRecentActivity(
  userId: string,
  page = 1,
  pageSize = 5,
): Promise<{
  entries: (
    | FeedListenEntry
    | FeedRating
    | FeedComment
    | FeedReview
    | FeedFollow
    | FeedFollowArtist
    | FeedCollection
    | FeedWanted
    | FeedCamino
  )[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}> {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  const extra = 1;
  const perSource = pageSize + extra;
  const followedUser = alias(appUser, "followed_user");

  const [
    listens,
    ratings,
    comments,
    reviews,
    follows,
    followArtists,
    collections,
    wanteds,
    caminosCreated,
    caminosCompleted,
  ] = await Promise.all([
    db
      .select({
        id: listenEntry.id,
        listenContext: listenEntry.listenContext,
        body: listenEntry.body,
        reaction: listenEntry.reaction,
        audience: listenEntry.audience,
        createdAt: listenEntry.createdAt,
        artistId: listenEntry.artistId,
        releaseGroupId: listenEntry.releaseGroupId,
        recordingId: listenEntry.recordingId,
        artistName: artist.name,
        creditedArtist: PRIMARY_ARTIST_SQL(listenEntry.releaseGroupId, listenEntry.recordingId),
        creditedArtistId: PRIMARY_ARTIST_ID_SQL(listenEntry.releaseGroupId, listenEntry.recordingId),
        recordingAlbumId: RECORDING_ALBUM_ID_SQL(listenEntry.recordingId),
        recordingAlbumTitle: RECORDING_ALBUM_TITLE_SQL(listenEntry.recordingId),
        releaseTitle: releaseGroup.title,
        releaseCover: releaseGroup.coverThumbUrl,
        recordingTitle: recording.title,
        authorId: listenEntry.userId,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
      })
      .from(listenEntry)
      .innerJoin(appUser, eq(listenEntry.userId, appUser.id))
      .leftJoin(artist, eq(listenEntry.artistId, artist.id))
      .leftJoin(releaseGroup, eq(listenEntry.releaseGroupId, releaseGroup.id))
      .leftJoin(recording, eq(listenEntry.recordingId, recording.id))
      .where(eq(listenEntry.userId, userId))
      .orderBy(desc(listenEntry.createdAt), desc(listenEntry.id))
      .limit(perSource),

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
        creditedArtist: PRIMARY_ARTIST_SQL(rating.releaseGroupId, rating.recordingId),
        creditedArtistId: PRIMARY_ARTIST_ID_SQL(rating.releaseGroupId, rating.recordingId),
        recordingAlbumId: RECORDING_ALBUM_ID_SQL(rating.recordingId),
        recordingAlbumTitle: RECORDING_ALBUM_TITLE_SQL(rating.recordingId),
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
      .where(eq(rating.userId, userId))
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
        creditedArtist: PRIMARY_ARTIST_SQL(comment.releaseGroupId, comment.recordingId),
        creditedArtistId: PRIMARY_ARTIST_ID_SQL(comment.releaseGroupId, comment.recordingId),
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
      .where(eq(comment.userId, userId))
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
        creditedArtist: PRIMARY_ARTIST_SQL(review.releaseGroupId, review.recordingId),
        creditedArtistId: PRIMARY_ARTIST_ID_SQL(review.releaseGroupId, review.recordingId),
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
      .where(eq(review.userId, userId))
      .orderBy(desc(review.updatedAt), desc(review.id))
      .limit(perSource),

    // Actividad propia: sin regla de visibilidad (siempre visible para el
    // propio lector), a diferencia de la misma fuente en `listFeed`.
    db
      .select({
        id: userFollow.id,
        createdAt: userFollow.updatedAt,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
        followedId: followedUser.id,
        followedUsername: followedUser.username,
        followedDisplayName: followedUser.displayName,
      })
      .from(userFollow)
      .innerJoin(appUser, eq(appUser.id, userFollow.followerId))
      .innerJoin(followedUser, eq(followedUser.id, userFollow.followedId))
      .where(and(eq(userFollow.followerId, userId), eq(userFollow.status, "accepted"), activeUserCondition(followedUser)))
      .orderBy(desc(userFollow.updatedAt), desc(userFollow.id))
      .limit(perSource),

    // Actividad propia: sin regla de visibilidad (un artista no tiene perfil
    // privado, y es la actividad del propio lector).
    db
      .select({
        id: artistFollow.id,
        createdAt: artistFollow.createdAt,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
        artistId: artistFollow.artistId,
        artistName: artist.name,
      })
      .from(artistFollow)
      .innerJoin(appUser, eq(appUser.id, artistFollow.userId))
      .innerJoin(artist, eq(artist.id, artistFollow.artistId))
      .where(eq(artistFollow.userId, userId))
      .orderBy(desc(artistFollow.createdAt), desc(artistFollow.id))
      .limit(perSource),

    // Colección, wishlist y Caminos propios (openspec: expand-feed-coverage):
    // mismas fuentes que `listFeed`, sin filtro de audiencia (contenido propio).
    collectionFeedQuery(eq(collectionEntry.userId, userId), perSource),
    wantedFeedQuery(eq(wantedEntry.userId, userId), perSource),
    caminoCreatedFeedQuery(and(...caminoBaseConditions([userId])), perSource),
    caminoCompletedFeedQuery(and(...caminoBaseConditions([userId])), perSource),
  ]);

  const listenEntries: FeedListenEntry[] = listens.map((row) => ({
    kind: "listen" as const,
    id: row.id,
    listenContext: row.listenContext as FeedListenEntry["listenContext"],
    body: row.body,
    reaction: row.reaction as FeedListenEntry["reaction"],
    audience: row.audience as FeedListenEntry["audience"],
    createdAt: row.createdAt.toISOString(),
    target: {
      type: targetType(row.artistId, row.releaseGroupId),
      id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
      title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
      subtitle: null,
      artistName: row.creditedArtist,
      artistId: row.creditedArtistId,
      albumId: row.recordingAlbumId,
      albumTitle: row.recordingAlbumTitle,
      coverThumbUrl: row.releaseCover,
    },
    author: author(row.authorId, row.authorUsername, row.authorDisplayName),
  }));

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
      artistName: row.creditedArtist,
      artistId: row.creditedArtistId,
      albumId: row.recordingAlbumId,
      albumTitle: row.recordingAlbumTitle,
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
      artistName: row.creditedArtist,
      artistId: row.creditedArtistId,
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
      artistName: row.creditedArtist,
      artistId: row.creditedArtistId,
      coverThumbUrl: row.releaseCover,
    },
    author: author(row.authorId, row.authorUsername, row.authorDisplayName),
  }));

  const followEntries: FeedFollow[] = follows.map((row) => ({
    kind: "follow" as const,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    followedUser: author(row.followedId, row.followedUsername, row.followedDisplayName),
    author: author(userId, row.authorUsername, row.authorDisplayName),
  }));

  const followArtistEntries: FeedFollowArtist[] = followArtists.map((row) => ({
    kind: "follow-artist" as const,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    artist: { id: row.artistId, name: row.artistName },
    author: author(userId, row.authorUsername, row.authorDisplayName),
  }));

  const merged = [
    ...listenEntries,
    ...ratingEntries,
    ...commentEntries,
    ...reviewEntries,
    ...followEntries,
    ...followArtistEntries,
    ...collections.map(collectionFeedEntry),
    ...wanteds.map(wantedFeedEntry),
    ...caminoFeedEntries(caminosCreated, caminosCompleted),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice((page - 1) * pageSize, page * pageSize + extra);

  return {
    entries: merged.slice(0, pageSize),
    page,
    pageSize,
    hasNext: merged.length > pageSize,
  };
}

export interface HomeRelease {
  id: string;
  title: string;
  artist: string;
  coverThumbUrl: string | null;
  releaseDate: string; // ISO (YYYY-MM-DD)
  section: "recent" | "upcoming";
  /**
   * Marca de la tarjeta (openspec: add-home-release-calendar): `announced` = disco de un artista
   * seguido que aún no tiene carátula.
   */
  badge: "announced" | null;
}

// Lanzamientos recientes / próximos: calendario real desde ListenBrainz (ver
// release-calendar-*.ts y docs/05-features/home.md).
export { listAnonymousReleases as listHomeReleases, listPersonalReleases as listPersonalHomeReleases } from "./release-calendar-read";
export { ensureReleaseCalendarFresh } from "./release-calendar-sync";

export interface PopularComment {
  id: string;
  body: string;
  /** Likes visibles: `null` bajo el umbral de 3 (add-comment-likes). */
  likeCount: number | null;
  authorUsername: string;
  authorDisplayName: string | null;
  target: {
    type: "artist" | "release-group" | "recording";
    id: string;
    title: string;
    coverThumbUrl: string | null;
  };
  stars: string | null; // valoración del autor sobre el target, si existe
  detailedScore: number | null; // puntaje 1–100 de esa valoración, si lo puso
}

export type PopularCommentsByType = Record<
  "artist" | "release-group" | "recording",
  PopularComment[]
>;

/**
 * "Comentarios populares" de Inicio, agrupados por tipo de entidad (artista /
 * álbum / canción) para el control segmentado.
 *
 * Ranking por likes reales (`comment_like`, add-comment-likes): conteo
 * descendente, desempate por longitud del texto (escritura sustancial) y
 * luego por fecha. La cifra que sale es la umbralizada (`null` bajo 3 likes);
 * el conteo real solo ordena y nunca sale del servidor.
 *
 * Filtra por perfil público y cuenta activa del autor, excluye comentarios
 * ocultos por moderación y, con visitante, los de autores con bloqueo en
 * cualquier dirección (como `listCommunityActivity`).
 */
export async function listPopularComments(
  perType = 6,
  viewerId: string | null = null,
): Promise<PopularCommentsByType> {
  const pool = perType * 3;
  const byPopularity = [
    desc(COMMENT_LIKE_COUNT_SQL),
    desc(sql<number>`length(${comment.body})`),
    desc(comment.createdAt),
  ];
  const visible = and(
    eq(comment.moderationStatus, "visible"),
    PUBLIC_PROFILE,
    viewerId ? NOT_BLOCKED_SQL(viewerId, comment.userId) : undefined,
  );

  const [artistRows, albumRows, songRows] = await Promise.all([
    db
      .select({
        id: comment.id,
        body: comment.body,
        likes: COMMENT_LIKE_COUNT_SQL,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
        targetId: comment.artistId,
        title: artist.name,
        stars: rating.stars,
        detailedScore: rating.detailedScore,
      })
      .from(comment)
      .innerJoin(appUser, eq(comment.userId, appUser.id))
      .innerJoin(artist, eq(comment.artistId, artist.id))
      .leftJoin(
        rating,
        and(eq(rating.userId, comment.userId), eq(rating.artistId, comment.artistId)),
      )
      .where(and(isNotNull(comment.artistId), visible))
      .orderBy(...byPopularity)
      .limit(pool),

    db
      .select({
        id: comment.id,
        body: comment.body,
        likes: COMMENT_LIKE_COUNT_SQL,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
        targetId: comment.releaseGroupId,
        title: releaseGroup.title,
        cover: releaseGroup.coverThumbUrl,
        stars: rating.stars,
        detailedScore: rating.detailedScore,
      })
      .from(comment)
      .innerJoin(appUser, eq(comment.userId, appUser.id))
      .innerJoin(releaseGroup, eq(comment.releaseGroupId, releaseGroup.id))
      .leftJoin(
        rating,
        and(
          eq(rating.userId, comment.userId),
          eq(rating.releaseGroupId, comment.releaseGroupId),
        ),
      )
      .where(and(isNotNull(comment.releaseGroupId), visible))
      .orderBy(...byPopularity)
      .limit(pool),

    db
      .select({
        id: comment.id,
        body: comment.body,
        likes: COMMENT_LIKE_COUNT_SQL,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
        targetId: comment.recordingId,
        title: recording.title,
        stars: rating.stars,
        detailedScore: rating.detailedScore,
      })
      .from(comment)
      .innerJoin(appUser, eq(comment.userId, appUser.id))
      .innerJoin(recording, eq(comment.recordingId, recording.id))
      .leftJoin(
        rating,
        and(eq(rating.userId, comment.userId), eq(rating.recordingId, comment.recordingId)),
      )
      .where(and(isNotNull(comment.recordingId), visible))
      .orderBy(...byPopularity)
      .limit(pool),
  ]);

  const rank = (
    rows: {
      id: string;
      body: string;
      likes: number;
      authorUsername: string | null;
      authorDisplayName: string | null;
      targetId: string | null;
      title: string | null;
      cover?: string | null;
      stars: string | null;
      detailedScore: number | null;
    }[],
    type: "artist" | "release-group" | "recording",
  ): PopularComment[] =>
    rows
      .map((row) => ({
        id: row.id,
        body: row.body,
        likeCount: thresholdedLikeCount(row.likes),
        authorUsername: row.authorUsername ?? "",
        authorDisplayName: row.authorDisplayName,
        target: {
          type,
          id: row.targetId ?? "",
          title: row.title ?? "",
          coverThumbUrl: row.cover ?? null,
        },
        stars: row.stars,
        detailedScore: row.detailedScore,
      }))
      .slice(0, perType);

  return {
    artist: rank(artistRows, "artist"),
    "release-group": rank(albumRows, "release-group"),
    recording: rank(songRows, "recording"),
  };
}

/**
 * Listas públicas recientes para Inicio: `user_list` con `audience = 'public'`
 * de cualquier usuario con perfil público, sin requerir relación de
 * seguimiento. Si hay `viewerId`, excluye propietarios bloqueados en
 * cualquier dirección. Sin paginación. Solo listas `standard`: un Camino
 * público tiene su propio descubrimiento (`/caminos`) y su propia ruta, y un
 * Recorrido es siempre privado.
 *
 * Cada lista trae su recuento de ítems y hasta 4 carátulas (en orden de la
 * lista) para el mini-mosaico de la fila — mismo criterio que
 * `getMostRecentEditedList`; las listas de artistas o canciones no tienen
 * carátula por ítem y quedan con el arreglo vacío.
 */
export interface HomePublicList extends FeedListEvent {
  itemCount: number;
  coverThumbUrls: string[];
}

export async function listPublicLists(viewerId: string | null, limit = 10): Promise<HomePublicList[]> {
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
        ? and(
            eq(userList.audience, "public"),
            eq(userList.kind, "standard"),
            PUBLIC_PROFILE,
            NOT_BLOCKED_SQL(viewerId, userList.ownerId),
          )
        : and(eq(userList.audience, "public"), eq(userList.kind, "standard"), PUBLIC_PROFILE),
    )
    .orderBy(desc(userList.updatedAt), desc(userList.id))
    .limit(limit);

  const ids = rows.map((row) => row.id);
  const countByList = new Map<string, number>();
  const coversByList = new Map<string, string[]>();

  if (ids.length > 0) {
    const ranked = db
      .select({
        listId: userListItem.listId,
        cover: releaseGroup.coverThumbUrl,
        rn: sql<number>`row_number() over (partition by ${userListItem.listId} order by ${userListItem.position})`.as("rn"),
      })
      .from(userListItem)
      .innerJoin(releaseGroup, eq(userListItem.releaseGroupId, releaseGroup.id))
      .where(and(inArray(userListItem.listId, ids), isNotNull(releaseGroup.coverThumbUrl)))
      .as("ranked");

    const [counts, covers] = await Promise.all([
      db
        .select({ listId: userListItem.listId, n: count() })
        .from(userListItem)
        .where(inArray(userListItem.listId, ids))
        .groupBy(userListItem.listId),
      db
        .select({ listId: ranked.listId, cover: ranked.cover })
        .from(ranked)
        .where(lte(ranked.rn, 4))
        .orderBy(ranked.listId, ranked.rn),
    ]);

    for (const row of counts) countByList.set(row.listId, Number(row.n));
    for (const row of covers) {
      if (!row.cover) continue;
      coversByList.set(row.listId, [...(coversByList.get(row.listId) ?? []), row.cover]);
    }
  }

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
    itemCount: countByList.get(row.id) ?? 0,
    coverThumbUrls: coversByList.get(row.id) ?? [],
  }));
}

export interface HomeResumeList {
  id: string;
  title: string;
  entityType: "artist" | "release-group" | "recording";
  itemCount: number;
  coverThumbUrls: string[];
}

/**
 * "Retoma una lista" de Inicio: la lista propia con actividad más reciente,
 * para seguir agregándole ítems. "Actividad" = el más reciente entre la última
 * edición de metadatos (`user_list.updated_at`, mantenido por trigger) y el
 * último ítem agregado (`max(user_list_item.created_at)`) — agregar ítems no
 * toca `updated_at` (ver drizzle/0009), así que ordenar solo por esa columna
 * dejaría afuera el caso más común de "seguir armando una lista".
 * Devuelve `null` si el usuario no tiene ninguna lista.
 */
export async function getMostRecentEditedList(userId: string): Promise<HomeResumeList | null> {
  const lastActivity = sql<string>`greatest(${userList.updatedAt}, coalesce(max(${userListItem.createdAt}), ${userList.updatedAt}))`;

  const [row] = await db
    .select({
      id: userList.id,
      title: userList.title,
      entityType: userList.entityType,
      itemCount: sql<number>`count(${userListItem.id})`,
    })
    .from(userList)
    .leftJoin(userListItem, eq(userListItem.listId, userList.id))
    .where(and(eq(userList.ownerId, userId), eq(userList.kind, "standard")))
    .groupBy(userList.id)
    .orderBy(desc(lastActivity), desc(userList.id))
    .limit(1);

  if (!row) return null;

  // Mini-mosaico: hasta 4 carátulas de los ítems, en orden de la lista. Solo
  // las listas de álbumes tienen carátula por ítem; para artistas y canciones
  // el arreglo queda vacío y el componente cae en el disco de fallback.
  const covers = await db
    .select({ cover: releaseGroup.coverThumbUrl })
    .from(userListItem)
    .innerJoin(releaseGroup, eq(userListItem.releaseGroupId, releaseGroup.id))
    .where(and(eq(userListItem.listId, row.id), isNotNull(releaseGroup.coverThumbUrl)))
    .orderBy(asc(userListItem.position))
    .limit(4);

  return {
    id: row.id,
    title: row.title,
    entityType: row.entityType as "artist" | "release-group" | "recording",
    itemCount: Number(row.itemCount),
    coverThumbUrls: covers
      .map((c) => c.cover)
      .filter((url): url is string => Boolean(url)),
  };
}
