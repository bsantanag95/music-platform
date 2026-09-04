import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/api/errors";
import {
  appUser,
  artist,
  comment,
  credit,
  listenEntry,
  rating,
  recording,
  releaseGroup,
  userList,
  userListItem,
} from "@/db/schema";
import { PRIMARY_ARTIST_SQL } from "@/services/feed/feed";
import type {
  FeedAuthor,
  FeedComment,
  FeedListEvent,
  FeedListenEntry,
  FeedRating,
} from "@/services/feed/feed";
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
 * "Tu rastro reciente" de Inicio: las escuchas, valoraciones y comentarios más
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
  entries: (FeedListenEntry | FeedRating | FeedComment)[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}> {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  const extra = 1;
  const perSource = pageSize + extra;

  const [listens, ratings, comments] = await Promise.all([
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
      coverThumbUrl: row.releaseCover,
    },
    author: author(row.authorId, row.authorUsername, row.authorDisplayName),
  }));

  const merged = [...listenEntries, ...ratingEntries, ...commentEntries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice((page - 1) * pageSize, page * pageSize + extra);

  return {
    entries: merged.slice(0, pageSize),
    page,
    pageSize,
    hasNext: merged.length > pageSize,
  };
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

export interface HomeRelease {
  id: string;
  title: string;
  artist: string;
  coverThumbUrl: string | null;
  releaseDate: string; // ISO (YYYY-MM-DD)
  section: "recent" | "upcoming";
}

/**
 * MAQUETA para el diseño de los apartados "Lanzamientos recientes" y
 * "Próximos lanzamientos" de Inicio (riel único en línea de tiempo).
 *
 * El pipeline real —fecha de lanzamiento a nivel `release_group`, curación
 * editorial, "upcoming" sin tracklist, decisión de producto sobre el
 * Principio 4— es de un sprint futuro (ver docs/05-features/home.md,
 * "'Lanzamientos recientes' y 'Próximos lanzamientos'").
 *
 * Por ahora: toma los release-groups con carátula más recientes y les asigna
 * fechas sintéticas repartidas alrededor de hoy (mitad pasado / mitad
 * futuro), una por semana, para poder revisar el layout con datos reales de
 * catálogo.
 */
export async function listHomeReleases(limit = 10): Promise<HomeRelease[]> {
  const rows = await db
    .select({
      id: releaseGroup.id,
      title: releaseGroup.title,
      coverThumbUrl: releaseGroup.coverThumbUrl,
      artistName: artist.name,
      position: credit.position,
    })
    .from(releaseGroup)
    .leftJoin(
      credit,
      and(eq(credit.releaseGroupId, releaseGroup.id), eq(credit.role, "primary")),
    )
    .leftJoin(artist, eq(artist.id, credit.artistId))
    .where(isNotNull(releaseGroup.coverThumbUrl))
    .orderBy(desc(releaseGroup.createdAt), asc(credit.position))
    .limit(limit * 4);

  // Dedupe por release-group y, para la maqueta, cap de 2 por artista: el seed
  // tiene la discografía completa de pocos artistas y sin esto el riel muestra
  // 8 discos del mismo.
  const seen = new Set<string>();
  const perArtist = new Map<string, number>();
  const unique: Omit<HomeRelease, "releaseDate" | "section">[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const artistKey = row.artistName ?? "";
    const count = perArtist.get(artistKey) ?? 0;
    if (artistKey && count >= 3) continue;
    perArtist.set(artistKey, count + 1);
    unique.push({
      id: row.id,
      title: row.title,
      artist: artistKey,
      coverThumbUrl: row.coverThumbUrl,
    });
    if (unique.length === limit) break;
  }

  const recentCount = Math.ceil(unique.length / 2);
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return unique.map((item, i) => {
    const weeksFromToday = i < recentCount ? i - recentCount : i - recentCount + 1;
    return {
      ...item,
      releaseDate: new Date(now + weeksFromToday * WEEK_MS).toISOString().slice(0, 10),
      section: i < recentCount ? "recent" : "upcoming",
    };
  });
}

export interface PopularComment {
  id: string;
  body: string;
  likeCount: number; // MAQUETA — ver listPopularComments
  authorUsername: string;
  authorDisplayName: string | null;
  target: {
    type: "artist" | "release-group" | "recording";
    id: string;
    title: string;
    coverThumbUrl: string | null;
  };
  stars: string | null; // valoración del autor sobre el target, si existe
}

export type PopularCommentsByType = Record<
  "artist" | "release-group" | "recording",
  PopularComment[]
>;

// MAQUETA: cantidad de likes por comentario. Determinística a partir del id
// para que sea estable entre renders. El mecanismo real de likes en
// comentarios (tabla, interacción, endpoint) es de un sprint futuro — ver
// docs/05-features/home.md, "Comentarios populares".
function mockLikeCount(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(i)) | 0;
  }
  return 4 + (Math.abs(hash) % 56); // 4..59
}

/**
 * "Comentarios populares" de Inicio, agrupados por tipo de entidad (artista /
 * álbum / canción) para el control segmentado.
 *
 * MAQUETA: los comentarios no tienen mecanismo de likes todavía, así que el
 * ranking se arma con un proxy —comentarios más largos, "escritura más
 * sustancial"— y a cada uno se le asigna un `likeCount` sintético estable, que
 * después define el orden mostrado. La versión real (tabla `comment_like`
 * anónima, decisión de gamificación, hilos de respuestas) es de un sprint
 * futuro — ver docs/05-features/home.md, "Comentarios populares".
 *
 * Filtra por perfil público del autor. No maneja bloqueos (la versión real sí
 * debería, como `listCommunityActivity`).
 */
export async function listPopularComments(perType = 6): Promise<PopularCommentsByType> {
  const pool = perType * 3;
  const byLongest = desc(sql<number>`length(${comment.body})`);

  const [artistRows, albumRows, songRows] = await Promise.all([
    db
      .select({
        id: comment.id,
        body: comment.body,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
        targetId: comment.artistId,
        title: artist.name,
        stars: rating.stars,
      })
      .from(comment)
      .innerJoin(appUser, eq(comment.userId, appUser.id))
      .innerJoin(artist, eq(comment.artistId, artist.id))
      .leftJoin(
        rating,
        and(eq(rating.userId, comment.userId), eq(rating.artistId, comment.artistId)),
      )
      .where(and(isNotNull(comment.artistId), PUBLIC_PROFILE))
      .orderBy(byLongest)
      .limit(pool),

    db
      .select({
        id: comment.id,
        body: comment.body,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
        targetId: comment.releaseGroupId,
        title: releaseGroup.title,
        cover: releaseGroup.coverThumbUrl,
        stars: rating.stars,
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
      .where(and(isNotNull(comment.releaseGroupId), PUBLIC_PROFILE))
      .orderBy(byLongest)
      .limit(pool),

    db
      .select({
        id: comment.id,
        body: comment.body,
        authorUsername: appUser.username,
        authorDisplayName: appUser.displayName,
        targetId: comment.recordingId,
        title: recording.title,
        stars: rating.stars,
      })
      .from(comment)
      .innerJoin(appUser, eq(comment.userId, appUser.id))
      .innerJoin(recording, eq(comment.recordingId, recording.id))
      .leftJoin(
        rating,
        and(eq(rating.userId, comment.userId), eq(rating.recordingId, comment.recordingId)),
      )
      .where(and(isNotNull(comment.recordingId), PUBLIC_PROFILE))
      .orderBy(byLongest)
      .limit(pool),
  ]);

  const rank = (
    rows: {
      id: string;
      body: string;
      authorUsername: string | null;
      authorDisplayName: string | null;
      targetId: string | null;
      title: string | null;
      cover?: string | null;
      stars: string | null;
    }[],
    type: "artist" | "release-group" | "recording",
  ): PopularComment[] =>
    rows
      .map((row) => ({
        id: row.id,
        body: row.body,
        likeCount: mockLikeCount(row.id),
        authorUsername: row.authorUsername ?? "",
        authorDisplayName: row.authorDisplayName,
        target: {
          type,
          id: row.targetId ?? "",
          title: row.title ?? "",
          coverThumbUrl: row.cover ?? null,
        },
        stars: row.stars,
      }))
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, perType);

  return {
    artist: rank(artistRows, "artist"),
    "release-group": rank(albumRows, "release-group"),
    recording: rank(songRows, "recording"),
  };
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
      // El bloque compacto de Inicio no muestra el artista; el feed sí (vía
      // listFeed). Aquí queda null a propósito.
      artistName: null,
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

export interface HomeResumeList {
  id: string;
  title: string;
  entityType: "artist" | "release-group" | "recording";
  itemCount: number;
  coverThumbUrls: string[];
}

/**
 * "Retomá una lista" de Inicio: la lista propia con actividad más reciente,
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
    .where(eq(userList.ownerId, userId))
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
