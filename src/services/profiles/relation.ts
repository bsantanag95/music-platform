import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { collectionEntry, favorite, listenEntry, listenEntryHighlight, rating, ratingHighlight, ratingShare, review } from "@/db/schema";
import type { ShareLocale } from "@/lib/share/kinds";
import { isValidUuid } from "@/lib/validation";
import { loadAlbumTarget, loadSongTarget } from "@/services/share/targets/catalog";
import type { RelationType } from "@/services/share/targets/relation";
import { ifVisible } from "@/services/share/targets/shared";
import { getProfileByUsername } from "@/services/social/profiles";
import { audiencesForProfile } from "@/services/social/visibility";

// Página de relación (spec relation-page): lo que una persona tiene con un disco o una canción, con las reglas de
// siempre para cada dato según quién mira. `null` si no hay nada visible: no revela si hay contenido.

const LISTENS_MAX = 20;

export interface RelationListen {
  id: string;
  listenContext: string;
  body: string | null;
  reaction: string | null;
  createdAt: string;
  focused: boolean;
}

export interface RelationView {
  owner: { username: string; displayName: string | null };
  object: { title: string; artistName: string | null; coverThumbUrl: string | null; href: string };
  rating: { stars: string; detailedScore: number | null } | null;
  listens: RelationListen[];
  review: { id: string; title: string | null; body: string } | null;
  favorite: boolean;
  collectionFormats: string[];
}

export async function getRelationView(
  username: string,
  type: RelationType,
  objectId: string,
  viewerId: string | null,
  locale: ShareLocale,
  focusListenId?: string | null,
): Promise<RelationView | null> {
  if (!isValidUuid(objectId)) return null;
  const profile = await ifVisible(getProfileByUsername(username, viewerId));
  if (!profile) return null;
  const audiences = audiencesForProfile(profile);
  if (audiences.length === 0) return null;
  const base = await (type === "album" ? loadAlbumTarget(objectId, locale) : loadSongTarget(objectId, locale));
  if (!base) return null;

  const album = type === "album";
  const ratingColumn = album ? rating.releaseGroupId : rating.recordingId;
  const listenColumn = album ? listenEntry.releaseGroupId : listenEntry.recordingId;
  const favoriteColumn = album ? favorite.releaseGroupId : favorite.recordingId;
  const focus = focusListenId && isValidUuid(focusListenId) ? focusListenId : null;
  const ratingsOpen = profile.relation === "self" || profile.relation === "following";

  const [ratingRows, listenRows, reviewRows, favoriteRows, collectionRows] = await Promise.all([
    db
      .select({
        stars: rating.stars,
        detailedScore: rating.detailedScore,
        shared: ratingShare.ratingId,
        highlighted: ratingHighlight.ratingId,
      })
      .from(rating)
      .leftJoin(ratingShare, eq(ratingShare.ratingId, rating.id))
      .leftJoin(ratingHighlight, eq(ratingHighlight.ratingId, rating.id))
      .where(and(eq(rating.userId, profile.id), eq(ratingColumn, objectId)))
      .limit(1),
    db
      .select({
        id: listenEntry.id,
        listenContext: listenEntry.listenContext,
        body: listenEntry.body,
        reaction: listenEntry.reaction,
        createdAt: listenEntry.createdAt,
      })
      .from(listenEntry)
      .leftJoin(listenEntryHighlight, eq(listenEntryHighlight.listenEntryId, listenEntry.id))
      .where(
        and(
          eq(listenEntry.userId, profile.id),
          eq(listenColumn, objectId),
          // Una entrada destacada se ve más allá de su audiencia (spec diary-visibility).
          or(inArray(listenEntry.audience, audiences), eq(listenEntryHighlight.userId, profile.id)),
        ),
      )
      .orderBy(
        ...(focus ? [sql`${listenEntry.id} = ${focus}::uuid DESC`] : []),
        desc(listenEntry.createdAt),
        desc(listenEntry.id),
      )
      .limit(LISTENS_MAX),
    album
      ? db
          .select({ id: review.id, title: review.title, body: review.body })
          .from(review)
          .where(and(eq(review.userId, profile.id), eq(review.releaseGroupId, objectId), eq(review.moderationStatus, "visible")))
          .limit(1)
      : Promise.resolve([]),
    db
      .select({ id: favorite.id })
      .from(favorite)
      .where(and(eq(favorite.userId, profile.id), eq(favoriteColumn, objectId), inArray(favorite.audience, audiences)))
      .limit(1),
    album
      ? db
          .select({ format: collectionEntry.format })
          .from(collectionEntry)
          .where(and(eq(collectionEntry.userId, profile.id), eq(collectionEntry.releaseGroupId, objectId), inArray(collectionEntry.audience, audiences)))
      : Promise.resolve([]),
  ]);

  const ownRating = ratingRows[0];
  const visibleRating = ownRating && (ratingsOpen || ownRating.shared || ownRating.highlighted) ? ownRating : null;
  const collectionFormats = [...new Set(collectionRows.map((row) => row.format))];
  const empty = !visibleRating && listenRows.length === 0 && reviewRows.length === 0 && favoriteRows.length === 0 && collectionFormats.length === 0;
  if (empty) return null;

  const media = base.card.media;
  return {
    owner: { username: profile.username, displayName: profile.displayName },
    object: {
      title: base.card.title,
      artistName: base.card.subtitle,
      coverThumbUrl: media.type === "cover" ? media.cover.url : null,
      // `canonicalPath` lleva el locale; `Link` lo agrega solo.
      href: base.canonicalPath.slice(locale.length + 1),
    },
    rating: visibleRating ? { stars: visibleRating.stars, detailedScore: visibleRating.detailedScore } : null,
    listens: listenRows.map((row) => ({
      id: row.id,
      listenContext: row.listenContext,
      body: row.body,
      reaction: row.reaction,
      createdAt: row.createdAt.toISOString(),
      focused: row.id === focus,
    })),
    review: reviewRows[0] ?? null,
    favorite: favoriteRows.length > 0,
    collectionFormats,
  };
}
