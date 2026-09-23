import { cache } from "react";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appUser, artist, artistFollow, favorite, rating, recording, releaseGroup, userFollow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { PRIMARY_ARTIST_SQL } from "@/services/feed/feed";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience, ProfileVisibility, UserSummary } from "@/services/social/types";
import type { ShowcaseEntity, ShowcaseEntityType } from "./showcase";
import { activeUserCondition } from "@/services/auth/account-status";
import { imageService } from "@/services/storage";

// Cuántos de los seguidores aprobados del dueño son personas que el visitante
// también sigue (relación aceptada). Señal para el aviso de perfil privado:
// solo la cantidad, nunca las identidades (el listado de seguidores del dueño
// no es accesible para un visitante no autorizado). Ver spec profile-affinity.
export async function mutualFollowersHint(
  viewerId: string,
  ownerId: string,
): Promise<number> {
  if (viewerId === ownerId) return 0;

  const ids = await viewerFollowingIds(viewerId);
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

export interface MutualUsersPage {
  users: UserSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

// Núcleo compartido de `listMutualFollowers`/`listMutualFollowing`: pagina
// las filas de `user_follow` cuyo lado libre (`userColumn`) está en
// `candidateIds` — el conjunto de cuentas que el visitante sigue, calculado
// aparte porque es el mismo para ambos listados. `ownerWhere` fija cuál lado
// de la relación es el dueño del perfil (quién sigue a quién).
async function pagedMutualUsers(
  candidateIds: string[],
  ownerWhere: SQL,
  userColumn: typeof userFollow.followerId | typeof userFollow.followedId,
  page: number,
  pageSize: number,
): Promise<MutualUsersPage> {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  if (candidateIds.length === 0) {
    return { users: [], totalCount: 0, page, pageSize, hasNext: false };
  }

  const where = and(ownerWhere, eq(userFollow.status, "accepted"), inArray(userColumn, candidateIds));
  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        user: {
          id: appUser.id,
          username: appUser.username,
          displayName: appUser.displayName,
          profileVisibility: appUser.profileVisibility,
          avatarImageId: appUser.avatarImageId,
        },
      })
      .from(userFollow)
      .innerJoin(appUser, eq(userColumn, appUser.id))
      .where(where)
      .orderBy(appUser.username)
      .limit(pageSize + 1)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(userFollow).where(where),
  ]);

  return {
    users: rows.slice(0, pageSize).map((row) => ({
      ...row.user,
      profileVisibility: row.user.profileVisibility as ProfileVisibility,
      avatarUrl: row.user.avatarImageId ? imageService.resolveUrl(row.user.avatarImageId) : null,
    })),
    totalCount: countRow?.count ?? 0,
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}

// Las cuentas que el visitante sigue y que están ACTIVAS: los candidatos de "en
// común" nunca incluyen a una cuenta desactivada (spec account-lifecycle).
async function viewerFollowingIds(viewerId: string): Promise<string[]> {
  const rows = await db
    .select({ id: userFollow.followedId })
    .from(userFollow)
    .innerJoin(appUser, eq(userFollow.followedId, appUser.id))
    .where(and(eq(userFollow.followerId, viewerId), eq(userFollow.status, "accepted"), activeUserCondition()));
  return rows.map((row) => row.id);
}

// "Seguidores en común": cuentas que el visitante sigue y que también siguen
// al dueño del perfil — el mismo criterio que `mutualFollowersHint`, pero con
// identidad en vez de solo el conteo (spec: nueva capacidad, ver
// docs/05-features/user-profile.md). A diferencia del hint del perfil
// privado, esta lista SÍ expone identidades — solo se usa en perfiles
// accesibles (ver `getMutualFollowersPreview`).
export async function listMutualFollowers(
  viewerId: string,
  ownerId: string,
  page = 1,
  pageSize = 20,
): Promise<MutualUsersPage> {
  if (viewerId === ownerId) return { users: [], totalCount: 0, page, pageSize, hasNext: false };
  const candidateIds = await viewerFollowingIds(viewerId);
  return pagedMutualUsers(candidateIds, eq(userFollow.followedId, ownerId), userFollow.followerId, page, pageSize);
}

// "Seguidos en común": cuentas que tanto el visitante como el dueño del
// perfil siguen — intersección simétrica de ambos listados de "seguidos".
export async function listMutualFollowing(
  viewerId: string,
  ownerId: string,
  page = 1,
  pageSize = 20,
): Promise<MutualUsersPage> {
  if (viewerId === ownerId) return { users: [], totalCount: 0, page, pageSize, hasNext: false };
  const candidateIds = await viewerFollowingIds(viewerId);
  return pagedMutualUsers(candidateIds, eq(userFollow.followerId, ownerId), userFollow.followedId, page, pageSize);
}

export interface MutualFollowersPreview {
  total: number;
  first: UserSummary;
}

// Previsualización para la Placa: primer seguidor en común (para el
// monograma) + el total. Devuelve `null` cuando no aplica — mismo criterio
// de acceso que `getProfileAffinity` (sin sesión, el propio dueño, bloqueo,
// o perfil no accesible) para no revelar identidades donde no corresponde.
export const getMutualFollowersPreview = cache(async function getMutualFollowersPreview(
  username: string,
  viewerId: string | null,
): Promise<MutualFollowersPreview | null> {
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

  const { users, totalCount } = await listMutualFollowers(viewerId, profile.id, 1, 1);
  const first = users[0];
  if (!first || totalCount === 0) return null;
  return { total: totalCount, first };
});

// --- Afinidad completa entre visitante y dueño (spec profile-affinity) ---

const AFFINITY_LIMIT = 8;

export interface ProfileAffinity {
  sharedFavorites: ShowcaseEntity[];
  sharedHighRatings: ShowcaseEntity[];
  sharedFollowedArtists: ShowcaseEntity[];
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

// Artistas que el usuario sigue (`artist_follow`, sin audiencia). Para la
// coincidencia "artistas que ambos siguen" (cambio add-artist-following).
async function followedArtistRefs(userId: string): Promise<EntityRef[]> {
  const rows = await db
    .select({ id: artistFollow.artistId })
    .from(artistFollow)
    .where(eq(artistFollow.userId, userId));
  return rows.map((r) => ({ type: "artist" as ShowcaseEntityType, id: r.id }));
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
            // Select de una sola tabla: la correlación va con la tabla escrita
            // (ver el comentario de `PRIMARY_ARTIST_SQL`), no con `${releaseGroup.id}`.
            credited: PRIMARY_ARTIST_SQL(sql.raw('"release_group"."id"'), sql.raw('"release_group"."id"')),
          })
          .from(releaseGroup)
          .where(inArray(releaseGroup.id, rgIds))
      : Promise.resolve([]),
    recIds.length
      ? db
          .select({
            id: recording.id,
            title: recording.title,
            credited: PRIMARY_ARTIST_SQL(sql.raw('"recording"."id"'), sql.raw('"recording"."id"')),
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
//
// `cache()` deduplica dentro del mismo request (openspec: rework-user-profile
// — el bloque de afinidad y la insignia "tú también" de Exploración leen el
// mismo cálculo), mismo criterio que `getTasteFingerprint`.
export const getProfileAffinity = cache(async function getProfileAffinity(
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

  const [ownerFavs, viewerFavs, ownerHigh, viewerHigh, ownerFollows, viewerFollows, mutual] =
    await Promise.all([
      favoriteRefs(profile.id, audiences),
      favoriteRefs(viewerId, null),
      ratingsVisible ? highRatingRefs(profile.id) : Promise.resolve([]),
      ratingsVisible ? highRatingRefs(viewerId) : Promise.resolve([]),
      followedArtistRefs(profile.id),
      followedArtistRefs(viewerId),
      mutualFollowersHint(viewerId, profile.id),
    ]);

  const [sharedFavorites, sharedHighRatings, sharedFollowedArtists] = await Promise.all([
    resolveEntities(intersect(viewerFavs, ownerFavs)),
    resolveEntities(intersect(viewerHigh, ownerHigh)),
    resolveEntities(intersect(viewerFollows, ownerFollows)),
  ]);

  if (
    sharedFavorites.length === 0 &&
    sharedHighRatings.length === 0 &&
    sharedFollowedArtists.length === 0 &&
    mutual === 0
  ) {
    return null;
  }

  return { sharedFavorites, sharedHighRatings, sharedFollowedArtists, mutualFollowers: mutual };
});
