import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, artist, comment, credit, rating, recording, releaseGroup, userList } from "@/db/schema";
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
