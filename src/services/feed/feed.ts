import { and, desc, eq, ilike, inArray, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  appUser,
  artist,
  comment,
  favorite,
  listenEntry,
  rating,
  recording,
  releaseGroup,
  userFollow,
  userList,
} from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { Audience } from "@/services/social/types";

export type FeedAuthor = { id: string; username: string; displayName: string | null };

export interface FeedListenEntry {
  kind: "listen";
  id: string;
  listenContext: "first_listen" | "relisten" | "rediscovery";
  body: string | null;
  reaction: "liked" | "loved" | "obsessed" | "neutral" | "disliked" | null;
  audience: Audience;
  createdAt: string;
  target: {
    type: "artist" | "release-group" | "recording";
    id: string;
    title: string;
    subtitle: string | null;
    artistName: string | null;
    coverThumbUrl: string | null;
  };
  author: FeedAuthor;
}

export interface FeedFavorite {
  kind: "favorite";
  id: string;
  targetType: "artist" | "release-group" | "recording";
  audience: Audience;
  createdAt: string;
  target: { id: string; title: string; artistName: string | null; coverThumbUrl: string | null };
  author: FeedAuthor;
}

export interface FeedListEvent {
  kind: "list";
  id: string;
  event: "created" | "updated";
  audience: Audience;
  createdAt: string;
  list: { id: string; title: string; entityType: "artist" | "release-group" | "recording" };
  author: FeedAuthor;
}

export interface FeedRating {
  kind: "rating";
  id: string;
  stars: string;
  detailedScore: number | null;
  createdAt: string;
  target: {
    type: "artist" | "release-group" | "recording";
    id: string;
    title: string;
    artistName: string | null;
    coverThumbUrl: string | null;
  };
  author: FeedAuthor;
}

export interface FeedComment {
  kind: "comment";
  id: string;
  body: string;
  createdAt: string;
  target: {
    type: "artist" | "release-group" | "recording";
    id: string;
    title: string;
    artistName: string | null;
    coverThumbUrl: string | null;
  };
  author: FeedAuthor;
}

export type FeedEntry = FeedListenEntry | FeedFavorite | FeedListEvent | FeedRating | FeedComment;

export const FEED_KINDS = ["listen", "favorite", "list", "rating", "comment"] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

// Filtros combinables de `listFeed` — cada campo es independiente y opcional.
// `authorId` SHALL pertenecer a los seguidos aceptados del lector (se valida
// antes de ejecutar cualquier query); `q` busca por coincidencia parcial sobre
// el título del objetivo (no sobre el cuerpo de comentarios o notas).
export interface FeedFilters {
  kind?: FeedKind;
  authorId?: string;
  q?: string;
}

const BLOCKED_SQL = (viewerId: string, authorId: unknown) =>
  sql`NOT EXISTS (
    SELECT 1 FROM user_block b
    WHERE (b.blocker_id = ${viewerId} AND b.blocked_id = ${authorId})
       OR (b.blocker_id = ${authorId} AND b.blocked_id = ${viewerId})
  )`;

// Nombre del artista principal acreditado de un álbum o canción, para el
// renglón "título · artista" del feed. Subquery escalar: no multiplica filas
// aunque el objetivo tenga varios créditos primarios (toma el de menor
// `position`). Para objetivos de tipo artista ambas columnas son NULL y
// devuelve NULL (el título ya es el artista).
export const PRIMARY_ARTIST_SQL = (releaseGroupIdCol: AnyColumn, recordingIdCol: AnyColumn) =>
  sql<string | null>`(
    SELECT a.name FROM credit c
    JOIN artist a ON a.id = c.artist_id
    WHERE (
      (${releaseGroupIdCol} IS NOT NULL AND c.release_group_id = ${releaseGroupIdCol})
      OR (${recordingIdCol} IS NOT NULL AND c.recording_id = ${recordingIdCol})
    ) AND c.role = 'primary'
    ORDER BY c.position
    LIMIT 1
  )`;

// Condición de búsqueda por título del objetivo, sobre las mismas columnas de
// artist/releaseGroup/recording que cada fuente (listen/favorite/rating/
// comment) ya deja unidas, más el artista principal acreditado (álbumes y
// canciones) — sin esto último, buscar "Fleetwood Mac" no encontraría sus
// canciones, solo entradas cuyo objetivo es la artista misma. Mismo criterio
// que `listMyDiary` (add-diary-filters). Devuelve un array (vacío o de un
// elemento) para poder spread-earlo directo dentro de `and(...)` sin
// condicionales sueltos. La fuente de listas no la usa (no tiene esos joins)
// — filtra por `ilike(userList.title, ...)` directo donde se arma esa query.
function titleSearchCondition(pattern: string | null, releaseGroupIdCol: AnyColumn, recordingIdCol: AnyColumn): SQL[] {
  if (!pattern) return [];
  const condition = or(
    ilike(artist.name, pattern),
    ilike(releaseGroup.title, pattern),
    ilike(recording.title, pattern),
    sql`${PRIMARY_ARTIST_SQL(releaseGroupIdCol, recordingIdCol)} ILIKE ${pattern}`,
  );
  return condition ? [condition] : [];
}

/**
 * Personas seguidas (relación aceptada) para poblar el `<select>` de autor del
 * filtro de feed: sin paginar (a diferencia de `listFollowing`, que topea en
 * 50 — un `<select>` nativo necesita la lista completa de antemano), orden
 * alfabético por username.
 */
export async function listFeedAuthors(viewerId: string): Promise<FeedAuthor[]> {
  const rows = await db
    .select({ id: appUser.id, username: appUser.username, displayName: appUser.displayName })
    .from(userFollow)
    .innerJoin(appUser, eq(userFollow.followedId, appUser.id))
    .where(and(eq(userFollow.followerId, viewerId), eq(userFollow.status, "accepted")))
    .orderBy(appUser.username);
  return rows.map((row) => ({ id: row.id, username: row.username ?? "", displayName: row.displayName }));
}

/**
 * Feed de actividad de usuarios seguidos: escuchas, favoritos, eventos de
 * listas (creación o actualización de metadatos), ratings vigentes y
 * comentarios. Se calcula bajo demanda uniendo las cinco fuentes y ordenando
 * por created_at DESC con desempate por fuente e id. Solo incluye actividades
 * visibles según audiencia y sin bloqueo; rating/comment no tienen audiencia
 * propia y se tratan como "public" implícita (ver design.md de
 * add-ratings-comments-feed).
 */
export async function listFeed(
  viewerId: string,
  page = 1,
  pageSize = 20,
  filters: FeedFilters = {},
) {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  const followed = await db
    .select({ followedId: userFollow.followedId })
    .from(userFollow)
    .where(and(eq(userFollow.followerId, viewerId), eq(userFollow.status, "accepted")));

  if (followed.length === 0) {
    return { entries: [], page, pageSize, hasNext: false };
  }

  const followedIds = followed.map((r) => r.followedId);

  if (filters.authorId && !followedIds.includes(filters.authorId)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El autor no pertenece a tus seguidos");
  }

  // Con `authorId` se acota a ese único seguido; sin él, a todos — sigue
  // siendo `inArray` en ambos casos para no bifurcar cada query en dos formas.
  const authorIds = filters.authorId ? [filters.authorId] : followedIds;

  const q = filters.q?.trim();
  const searchPattern = q ? `%${q}%` : null;

  // Con `kind` presente, se saltea la query de cualquier otra fuente en vez de
  // traerla y descartarla al fusionar: es a la vez el filtro y una mejora de
  // rendimiento (ver design.md, decisión 1).
  const includeKind = (kind: FeedKind) => !filters.kind || filters.kind === kind;

  // Se consulta una página ampliada por fuente y se fusiona en memoria: la
  // composición heterogénea no permite paginación SQL única sin una tabla de
  // eventos (se evalúa con volumen real, ver phase-5-design.md §9).
  const extra = 1;
  const perSource = pageSize + extra;

  const [listens, favorites, lists, ratings, comments] = await Promise.all([
    includeKind("listen")
      ? db
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
            releaseTitle: releaseGroup.title,
            releaseCover: releaseGroup.coverThumbUrl,
            recordingTitle: recording.title,
            authorId: listenEntry.userId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
          })
          .from(listenEntry)
          .leftJoin(artist, eq(listenEntry.artistId, artist.id))
          .leftJoin(releaseGroup, eq(listenEntry.releaseGroupId, releaseGroup.id))
          .leftJoin(recording, eq(listenEntry.recordingId, recording.id))
          .leftJoin(appUser, eq(listenEntry.userId, appUser.id))
          .where(
            and(
              inArray(listenEntry.userId, authorIds),
              inArray(listenEntry.audience, ["followers", "public"]),
              BLOCKED_SQL(viewerId, listenEntry.userId),
              ...titleSearchCondition(searchPattern, listenEntry.releaseGroupId, listenEntry.recordingId),
            ),
          )
          .orderBy(desc(listenEntry.createdAt), desc(listenEntry.id))
          .limit(perSource)
      : Promise.resolve([]),

    includeKind("favorite")
      ? db
          .select({
            id: favorite.id,
            audience: favorite.audience,
            createdAt: favorite.createdAt,
            artistId: favorite.artistId,
            releaseGroupId: favorite.releaseGroupId,
            recordingId: favorite.recordingId,
            artistName: artist.name,
            creditedArtist: PRIMARY_ARTIST_SQL(favorite.releaseGroupId, favorite.recordingId),
            releaseTitle: releaseGroup.title,
            releaseCover: releaseGroup.coverThumbUrl,
            recordingTitle: recording.title,
            authorId: favorite.userId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
          })
          .from(favorite)
          .leftJoin(artist, eq(favorite.artistId, artist.id))
          .leftJoin(releaseGroup, eq(favorite.releaseGroupId, releaseGroup.id))
          .leftJoin(recording, eq(favorite.recordingId, recording.id))
          .leftJoin(appUser, eq(favorite.userId, appUser.id))
          .where(
            and(
              inArray(favorite.userId, authorIds),
              inArray(favorite.audience, ["followers", "public"]),
              BLOCKED_SQL(viewerId, favorite.userId),
              ...titleSearchCondition(searchPattern, favorite.releaseGroupId, favorite.recordingId),
            ),
          )
          .orderBy(desc(favorite.createdAt), desc(favorite.id))
          .limit(perSource)
      : Promise.resolve([]),

    includeKind("list")
      ? db
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
          .leftJoin(appUser, eq(userList.ownerId, appUser.id))
          .where(
            and(
              inArray(userList.ownerId, authorIds),
              inArray(userList.audience, ["followers", "public"]),
              BLOCKED_SQL(viewerId, userList.ownerId),
              ...(searchPattern ? [ilike(userList.title, searchPattern)] : []),
            ),
          )
          .orderBy(desc(userList.createdAt), desc(userList.id))
          .limit(perSource)
      : Promise.resolve([]),

    // rating/comment no tienen columna de audiencia propia: se tratan como
    // audiencia "public" implícita, ya cubierta por pertenecer a followedIds
    // (relación aceptada) — ver design.md de add-ratings-comments-feed.
    includeKind("rating")
      ? db
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
            releaseTitle: releaseGroup.title,
            releaseCover: releaseGroup.coverThumbUrl,
            recordingTitle: recording.title,
            authorId: rating.userId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
          })
          .from(rating)
          .leftJoin(artist, eq(rating.artistId, artist.id))
          .leftJoin(releaseGroup, eq(rating.releaseGroupId, releaseGroup.id))
          .leftJoin(recording, eq(rating.recordingId, recording.id))
          .leftJoin(appUser, eq(rating.userId, appUser.id))
          .where(
            and(
              inArray(rating.userId, authorIds),
              BLOCKED_SQL(viewerId, rating.userId),
              ...titleSearchCondition(searchPattern, rating.releaseGroupId, rating.recordingId),
            ),
          )
          .orderBy(desc(rating.updatedAt), desc(rating.id))
          .limit(perSource)
      : Promise.resolve([]),

    includeKind("comment")
      ? db
          .select({
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt,
            artistId: comment.artistId,
            releaseGroupId: comment.releaseGroupId,
            recordingId: comment.recordingId,
            artistName: artist.name,
            creditedArtist: PRIMARY_ARTIST_SQL(comment.releaseGroupId, comment.recordingId),
            releaseTitle: releaseGroup.title,
            releaseCover: releaseGroup.coverThumbUrl,
            recordingTitle: recording.title,
            authorId: comment.userId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
          })
          .from(comment)
          .leftJoin(artist, eq(comment.artistId, artist.id))
          .leftJoin(releaseGroup, eq(comment.releaseGroupId, releaseGroup.id))
          .leftJoin(recording, eq(comment.recordingId, recording.id))
          .leftJoin(appUser, eq(comment.userId, appUser.id))
          .where(
            and(
              inArray(comment.userId, authorIds),
              BLOCKED_SQL(viewerId, comment.userId),
              ...titleSearchCondition(searchPattern, comment.releaseGroupId, comment.recordingId),
            ),
          )
          .orderBy(desc(comment.createdAt), desc(comment.id))
          .limit(perSource)
      : Promise.resolve([]),
  ]);

  const author = (id: string, username: string | null, displayName: string | null): FeedAuthor => ({
    id,
    username: username ?? "",
    displayName,
  });

  const listenEntries: FeedEntry[] = listens.map((row) => {
    const type: "artist" | "release-group" | "recording" = row.artistId
      ? "artist"
      : row.releaseGroupId
        ? "release-group"
        : "recording";
    return {
      kind: "listen",
      id: row.id,
      listenContext: row.listenContext as FeedListenEntry["listenContext"],
      body: row.body,
      reaction: row.reaction as FeedListenEntry["reaction"],
      audience: row.audience as Audience,
      createdAt: row.createdAt.toISOString(),
      target: {
        type,
        id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
        title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
        subtitle: null,
        artistName: row.creditedArtist,
        coverThumbUrl: row.releaseCover,
      },
      author: author(row.authorId, row.authorUsername, row.authorDisplayName),
    };
  });

  const favoriteEntries: FeedEntry[] = favorites.map((row) => {
    const targetType =
      row.artistId ? "artist" : row.releaseGroupId ? "release-group" : "recording";
    return {
      kind: "favorite" as const,
      id: row.id,
      targetType,
      audience: row.audience as Audience,
      createdAt: row.createdAt.toISOString(),
      target: {
        id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
        title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
        artistName: row.creditedArtist,
        coverThumbUrl: row.releaseCover,
      },
      author: author(row.authorId, row.authorUsername, row.authorDisplayName),
    };
  });

  const listEntries: FeedEntry[] = lists.map((row) => ({
    kind: "list",
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

  const ratingEntries: FeedEntry[] = ratings.map((row) => {
    const type: "artist" | "release-group" | "recording" = row.artistId
      ? "artist"
      : row.releaseGroupId
        ? "release-group"
        : "recording";
    return {
      kind: "rating" as const,
      id: row.id,
      stars: row.stars,
      detailedScore: row.detailedScore,
      createdAt: row.updatedAt.toISOString(),
      target: {
        type,
        id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
        title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
        artistName: row.creditedArtist,
        coverThumbUrl: row.releaseCover,
      },
      author: author(row.authorId, row.authorUsername, row.authorDisplayName),
    };
  });

  const commentEntries: FeedEntry[] = comments.map((row) => {
    const type: "artist" | "release-group" | "recording" = row.artistId
      ? "artist"
      : row.releaseGroupId
        ? "release-group"
        : "recording";
    return {
      kind: "comment" as const,
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      target: {
        type,
        id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
        title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
        artistName: row.creditedArtist,
        coverThumbUrl: row.releaseCover,
      },
      author: author(row.authorId, row.authorUsername, row.authorDisplayName),
    };
  });

  const merged = [...listenEntries, ...favoriteEntries, ...listEntries, ...ratingEntries, ...commentEntries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice((page - 1) * pageSize, page * pageSize + extra);

  return {
    entries: merged.slice(0, pageSize),
    page,
    pageSize,
    hasNext: merged.length > pageSize,
  };
}