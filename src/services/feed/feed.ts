import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appUser,
  artist,
  favorite,
  listenEntry,
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
  target: { id: string; title: string; coverThumbUrl: string | null };
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

export type FeedEntry = FeedListenEntry | FeedFavorite | FeedListEvent;

const BLOCKED_SQL = (viewerId: string, authorId: unknown) =>
  sql`NOT EXISTS (
    SELECT 1 FROM user_block b
    WHERE (b.blocker_id = ${viewerId} AND b.blocked_id = ${authorId})
       OR (b.blocker_id = ${authorId} AND b.blocked_id = ${viewerId})
  )`;

/**
 * Feed de actividad de usuarios seguidos: escuchas, favoritos y eventos de
 * listas (creación o actualización de metadatos). Se calcula bajo demanda
 * uniendo las tres fuentes y ordenando por created_at DESC con desempate por
 * fuente e id. Solo incluye actividades visibles según audiencia y sin bloqueo.
 */
export async function listFeed(viewerId: string, page = 1, pageSize = 20) {
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

  // Se consulta una página ampliada por fuente y se fusiona en memoria: la
  // composición heterogénea no permite paginación SQL única sin una tabla de
  // eventos (se evalúa con volumen real, ver phase-5-design.md §9).
  const extra = 1;
  const perSource = pageSize + extra;

  const [listens, favorites, lists] = await Promise.all([
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
      .where(and(inArray(listenEntry.userId, followedIds), inArray(listenEntry.audience, ["followers", "public"]), BLOCKED_SQL(viewerId, listenEntry.userId)))
      .orderBy(desc(listenEntry.createdAt), desc(listenEntry.id))
      .limit(perSource),

    db
      .select({
        id: favorite.id,
        audience: favorite.audience,
        createdAt: favorite.createdAt,
        artistId: favorite.artistId,
        releaseGroupId: favorite.releaseGroupId,
        recordingId: favorite.recordingId,
        artistName: artist.name,
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
      .where(and(inArray(favorite.userId, followedIds), inArray(favorite.audience, ["followers", "public"]), BLOCKED_SQL(viewerId, favorite.userId)))
      .orderBy(desc(favorite.createdAt), desc(favorite.id))
      .limit(perSource),

    db
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
      .where(and(inArray(userList.ownerId, followedIds), inArray(userList.audience, ["followers", "public"]), BLOCKED_SQL(viewerId, userList.ownerId)))
      .orderBy(desc(userList.createdAt), desc(userList.id))
      .limit(perSource),
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

  const merged = [...listenEntries, ...favoriteEntries, ...listEntries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice((page - 1) * pageSize, page * pageSize + extra);

  return {
    entries: merged.slice(0, pageSize),
    page,
    pageSize,
    hasNext: merged.length > pageSize,
  };
}