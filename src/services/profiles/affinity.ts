import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, favorite, rating, recording, releaseGroup, userFollow } from "@/db/schema";
import { PRIMARY_ARTIST_SQL } from "@/services/feed/feed";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience } from "@/services/social/types";
import type { ShowcaseEntity, ShowcaseEntityType } from "./showcase";

// Cuántos de los seguidores aprobados del dueño son personas que el visitante
// también sigue (relación aceptada). Señal para el aviso de perfil privado:
// solo la cantidad, nunca las identidades (el listado de seguidores del dueño
// no es accesible para un visitante no autorizado). Ver spec profile-affinity.
export async function mutualFollowersHint(
  viewerId: string,
  ownerId: string,
): Promise<number> {
  if (viewerId === ownerId) return 0;

  const viewerFollowing = await db
    .select({ id: userFollow.followedId })
    .from(userFollow)
    .where(and(eq(userFollow.followerId, viewerId), eq(userFollow.status, "accepted")));

  const ids = viewerFollowing.map((row) => row.id);
  if (ids.length === 0) return 0;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userFollow)
    .where(
      and(
        eq(userFollow.followedId, ownerId),
        eq(userFollow.status, "accepted"),
        inArray(userFollow.followerId, ids),
      ),
    );

  return row?.count ?? 0;
}

// --- Afinidad completa entre visitante y dueño (spec profile-affinity) ---

const AFFINITY_LIMIT = 8;

export interface ProfileAffinity {
  sharedFavorites: ShowcaseEntity[];
  sharedHighRatings: ShowcaseEntity[];
  mutualFollowers: number;
}

type EntityRef = { type: ShowcaseEntityType; id: string };

function refFromRow(row: {
  artistId: string | null;
  releaseGroupId: string | null;
  recordingId: string | null;
}): EntityRef | null {
  if (row.artistId) return { type: "artist", id: row.artistId };
  if (row.releaseGroupId) return { type: "release-group", id: row.releaseGroupId };
  if (row.recordingId) return { type: "recording", id: row.recordingId };
  return null;
}

async function favoriteRefs(userId: string, audiences: Audience[] | null): Promise<EntityRef[]> {
  if (audiences && audiences.length === 0) return [];
  const rows = await db
    .select({
      artistId: favorite.artistId,
      releaseGroupId: favorite.releaseGroupId,
      recordingId: favorite.recordingId,
    })
    .from(favorite)
    .where(
      audiences
        ? and(eq(favorite.userId, userId), inArray(favorite.audience, audiences))
        : eq(favorite.userId, userId),
    );
  return rows.map(refFromRow).filter((ref): ref is EntityRef => ref !== null);
}

async function highRatingRefs(userId: string): Promise<EntityRef[]> {
  const rows = await db
    .select({
      artistId: rating.artistId,
      releaseGroupId: rating.releaseGroupId,
      recordingId: rating.recordingId,
    })
    .from(rating)
    .where(and(eq(rating.userId, userId), sql`${rating.stars} >= 4`));
  return rows.map(refFromRow).filter((ref): ref is EntityRef => ref !== null);
}

function intersect(a: EntityRef[], b: EntityRef[]): EntityRef[] {
  const bIds = new Set(b.map((ref) => ref.id));
  const seen = new Set<string>();
  const out: EntityRef[] = [];
  for (const ref of a) {
    if (bIds.has(ref.id) && !seen.has(ref.id)) {
      seen.add(ref.id);
      out.push(ref);
    }
  }
  return out.slice(0, AFFINITY_LIMIT);
}

async function resolveEntities(refs: EntityRef[]): Promise<ShowcaseEntity[]> {
  if (refs.length === 0) return [];
  const artistIds = refs.filter((r) => r.type === "artist").map((r) => r.id);
  const rgIds = refs.filter((r) => r.type === "release-group").map((r) => r.id);
  const recIds = refs.filter((r) => r.type === "recording").map((r) => r.id);

  const [artists, releaseGroups, recordings] = await Promise.all([
    artistIds.length
      ? db.select({ id: artist.id, name: artist.name }).from(artist).where(inArray(artist.id, artistIds))
      : Promise.resolve([]),
    rgIds.length
      ? db
          .select({
            id: releaseGroup.id,
            title: releaseGroup.title,
            cover: releaseGroup.coverThumbUrl,
            credited: PRIMARY_ARTIST_SQL(releaseGroup.id, releaseGroup.id),
          })
          .from(releaseGroup)
          .where(inArray(releaseGroup.id, rgIds))
      : Promise.resolve([]),
    recIds.length
      ? db
          .select({
            id: recording.id,
            title: recording.title,
            credited: PRIMARY_ARTIST_SQL(recording.id, recording.id),
          })
          .from(recording)
          .where(inArray(recording.id, recIds))
      : Promise.resolve([]),
  ]);

  const byId = new Map<string, ShowcaseEntity>();
  for (const a of artists) {
    byId.set(a.id, { type: "artist", id: a.id, title: a.name, artistName: null, coverThumbUrl: null });
  }
  for (const rg of releaseGroups) {
    byId.set(rg.id, {
      type: "release-group",
      id: rg.id,
      title: rg.title,
      artistName: rg.credited,
      coverThumbUrl: rg.cover,
    });
  }
  for (const rec of recordings) {
    byId.set(rec.id, {
      type: "recording",
      id: rec.id,
      title: rec.title,
      artistName: rec.credited,
      coverThumbUrl: null,
    });
  }

  // Preserva el orden de `refs`, omite lo que ya no exista.
  return refs.map((ref) => byId.get(ref.id)).filter((e): e is ShowcaseEntity => e !== undefined);
}

// Coincidencias entre el visitante autenticado y el dueño del perfil. Devuelve
// null cuando no aplica: sin sesión, el propio dueño, perfil no accesible, o
// relación de bloqueo. `sharedHighRatings` solo se calcula si el visitante
// tiene permitido ver las valoraciones del dueño (dueño o seguidor aprobado).
export async function getProfileAffinity(
  username: string,
  viewerId: string | null,
): Promise<ProfileAffinity | null> {
  if (!viewerId) return null;

  const { getProfileByUsername } = await import("@/services/social/profiles");
  const profile = await getProfileByUsername(username, viewerId);
  if (
    profile.relation === "self" ||
    profile.relation === "blocked" ||
    profile.blockedByMe ||
    !profile.accessible
  ) {
    return null;
  }

  const audiences = audiencesForProfile(profile) as Audience[];
  const ratingsVisible = profile.relation === "following";

  const [ownerFavs, viewerFavs, ownerHigh, viewerHigh, mutual] = await Promise.all([
    favoriteRefs(profile.id, audiences),
    favoriteRefs(viewerId, null),
    ratingsVisible ? highRatingRefs(profile.id) : Promise.resolve([]),
    ratingsVisible ? highRatingRefs(viewerId) : Promise.resolve([]),
    mutualFollowersHint(viewerId, profile.id),
  ]);

  const [sharedFavorites, sharedHighRatings] = await Promise.all([
    resolveEntities(intersect(viewerFavs, ownerFavs)),
    resolveEntities(intersect(viewerHigh, ownerHigh)),
  ]);

  if (sharedFavorites.length === 0 && sharedHighRatings.length === 0 && mutual === 0) {
    return null;
  }

  return { sharedFavorites, sharedHighRatings, mutualFollowers: mutual };
}
