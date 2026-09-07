import { cache } from "react";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  collectionEntry,
  favorite,
  listenEntry,
  rating,
  release,
  releaseGroupTag,
  userList,
} from "@/db/schema";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience } from "@/services/social/types";

// Estrellas posibles: 0,5 a 5 en pasos de media (paso enforced en el CHECK de
// la migración 0000). La curva siempre tiene los 10 cubos, con 0 donde no hay.
const STAR_BUCKETS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;
const TOP_GENRES = 8;

export interface RatingCurvePoint {
  stars: number;
  count: number;
}

export interface RidgePoint {
  label: string;
  count: number;
}

export interface TasteFingerprint {
  /** El visitante tiene permitido ver las valoraciones (dueño o seguidor aprobado). */
  ratingsVisible: boolean;
  /** null cuando no hay curva para mostrar (no visible, o sin valoraciones). */
  ratingCurve: RatingCurvePoint[] | null;
  totalRatings: number;
  /** Décadas presentes, orden ascendente. Puede estar vacío. */
  decades: RidgePoint[];
  /** Géneros más presentes. Vacío cuando no hay datos de tag. */
  genres: RidgePoint[];
  genreDataAvailable: boolean;
  split: {
    ratedArtists: number;
    ratedAlbums: number;
    ratedSongs: number;
    collection: number;
    lists: number;
  };
}

async function computeRatingStats(userId: string) {
  const [curveRows, typeRows] = await Promise.all([
    db
      .select({ stars: rating.stars, n: sql<number>`count(*)::int` })
      .from(rating)
      .where(eq(rating.userId, userId))
      .groupBy(rating.stars),
    db
      .select({
        artists: sql<number>`count(*) filter (where ${rating.artistId} is not null)::int`,
        albums: sql<number>`count(*) filter (where ${rating.releaseGroupId} is not null)::int`,
        songs: sql<number>`count(*) filter (where ${rating.recordingId} is not null)::int`,
      })
      .from(rating)
      .where(eq(rating.userId, userId)),
  ]);

  const byStar = new Map(curveRows.map((row) => [Number(row.stars), row.n]));
  const curve = STAR_BUCKETS.map((stars) => ({ stars, count: byStar.get(stars) ?? 0 }));
  const total = curve.reduce((sum, point) => sum + point.count, 0);
  const types = typeRows[0] ?? { artists: 0, albums: 0, songs: 0 };

  return {
    curve,
    total,
    ratedArtists: types.artists,
    ratedAlbums: types.albums,
    ratedSongs: types.songs,
  };
}

// release_group con actividad visible del dueño: valoraciones (si el visitante
// puede verlas) ∪ favoritos y escuchas con audiencia compatible.
async function visibleAlbumIds(
  userId: string,
  audiences: Audience[],
  ratingsVisible: boolean,
): Promise<string[]> {
  const [ratedRgs, favRgs, listenRgs] = await Promise.all([
    ratingsVisible
      ? db
          .select({ id: rating.releaseGroupId })
          .from(rating)
          .where(and(eq(rating.userId, userId), isNotNull(rating.releaseGroupId)))
      : Promise.resolve([] as { id: string | null }[]),
    audiences.length
      ? db
          .select({ id: favorite.releaseGroupId })
          .from(favorite)
          .where(
            and(
              eq(favorite.userId, userId),
              isNotNull(favorite.releaseGroupId),
              inArray(favorite.audience, audiences),
            ),
          )
      : Promise.resolve([] as { id: string | null }[]),
    audiences.length
      ? db
          .select({ id: listenEntry.releaseGroupId })
          .from(listenEntry)
          .where(
            and(
              eq(listenEntry.userId, userId),
              isNotNull(listenEntry.releaseGroupId),
              inArray(listenEntry.audience, audiences),
            ),
          )
      : Promise.resolve([] as { id: string | null }[]),
  ]);

  const ids = new Set<string>();
  for (const row of [...ratedRgs, ...favRgs, ...listenRgs]) {
    if (row.id) ids.add(row.id);
  }
  return [...ids];
}

async function computeDecades(albumIds: string[]): Promise<RidgePoint[]> {
  if (albumIds.length === 0) return [];
  // Una década por álbum: la de su edición más temprana con fecha.
  const rows = await db
    .select({
      decade: sql<number>`(floor(min(extract(year from ${release.releaseDate})) / 10) * 10)::int`,
    })
    .from(release)
    .where(and(inArray(release.releaseGroupId, albumIds), isNotNull(release.releaseDate)))
    .groupBy(release.releaseGroupId);

  const counts = new Map<number, number>();
  for (const row of rows) {
    if (row.decade == null) continue;
    counts.set(row.decade, (counts.get(row.decade) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([decade, count]) => ({ label: `${decade}s`, count }))
    .sort((a, b) => Number(a.label.slice(0, -1)) - Number(b.label.slice(0, -1)));
}

async function computeGenres(albumIds: string[]): Promise<RidgePoint[]> {
  if (albumIds.length === 0) return [];
  const rows = await db
    .select({
      tag: releaseGroupTag.tag,
      total: sql<number>`sum(${releaseGroupTag.count})::int`,
    })
    .from(releaseGroupTag)
    .where(inArray(releaseGroupTag.releaseGroupId, albumIds))
    .groupBy(releaseGroupTag.tag)
    .orderBy(sql`sum(${releaseGroupTag.count}) desc`)
    .limit(TOP_GENRES);
  return rows.map((row) => ({ label: row.tag, count: row.total }));
}

async function countByAudience(
  table: typeof collectionEntry | typeof userList,
  ownerColumn: typeof collectionEntry.userId | typeof userList.ownerId,
  audienceColumn: typeof collectionEntry.audience | typeof userList.audience,
  ownerId: string,
  audiences: Audience[],
): Promise<number> {
  if (audiences.length === 0) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(table)
    .where(and(eq(ownerColumn, ownerId), inArray(audienceColumn, audiences)));
  return row?.n ?? 0;
}

// Huella de gusto del perfil, filtrada por lo que el visitante puede ver.
// Cálculo bajo demanda; `cache()` deduplica dentro del mismo request (la
// página y el endpoint comparten el resultado). Devuelve null cuando el
// visitante no tiene acceso al contenido del perfil.
export const getTasteFingerprint = cache(
  async (username: string, viewerId: string | null): Promise<TasteFingerprint | null> => {
    const { getProfileByUsername } = await import("@/services/social/profiles");
    const profile = await getProfileByUsername(username, viewerId);
    if (!profile.accessible) return null;

    const audiences = audiencesForProfile(profile) as Audience[];
    const ratingsVisible = profile.relation === "self" || profile.relation === "following";

    const [ratingStats, albumIds, collectionCount, listCount] = await Promise.all([
      ratingsVisible
        ? computeRatingStats(profile.id)
        : Promise.resolve(null),
      visibleAlbumIds(profile.id, audiences, ratingsVisible),
      countByAudience(
        collectionEntry,
        collectionEntry.userId,
        collectionEntry.audience,
        profile.id,
        audiences,
      ),
      countByAudience(userList, userList.ownerId, userList.audience, profile.id, audiences),
    ]);

    const [decades, genres] = await Promise.all([
      computeDecades(albumIds),
      computeGenres(albumIds),
    ]);

    const hasCurve = ratingStats !== null && ratingStats.total > 0;

    return {
      ratingsVisible,
      ratingCurve: hasCurve ? ratingStats.curve : null,
      totalRatings: ratingStats?.total ?? 0,
      decades,
      genres,
      genreDataAvailable: genres.length > 0,
      split: {
        ratedArtists: ratingStats?.ratedArtists ?? 0,
        ratedAlbums: ratingStats?.ratedAlbums ?? 0,
        ratedSongs: ratingStats?.ratedSongs ?? 0,
        collection: collectionCount,
        lists: listCount,
      },
    };
  },
);
