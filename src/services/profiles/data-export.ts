import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  appUser,
  artist,
  artistFollow,
  collectionEntry,
  comment,
  favorite,
  listenEntry,
  listenEntryHighlight,
  listSave,
  rating,
  ratingHighlight,
  recording,
  releaseGroup,
  review,
  userBlock,
  userFollow,
  userList,
  userListItem,
  userListPin,
  userPinnedItem,
  userProfileLink,
  userProfilePrompt,
  userShowcase,
  wantedEntry,
  wantToListenEntry,
} from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { imageService } from "@/services/storage";

// Exportación de los datos propios (spec account-lifecycle, "Exportar los datos
// propios"): un objeto JSON con lo que la persona creó, para descargarlo. Solo
// datos de ELLA: nunca el hash de la contraseña, tokens ni sesiones, ni datos
// privados de otras personas (los seguidores, seguidos y bloqueados se exportan
// como usuarios públicos, no como sus perfiles; las columnas de auditoría de
// moderación —quién moderó— se dejan fuera). Los identificadores del catálogo se
// acompañan de un diccionario con sus nombres para que el archivo se pueda leer.

export const DATA_EXPORT_VERSION = 1;

type CatalogRefs = { artistId?: string | null; releaseGroupId?: string | null; recordingId?: string | null };

export interface DataExport {
  version: number;
  exportedAt: string;
  account: Record<string, unknown>;
  profile: {
    links: unknown[];
    pinned: unknown[];
    showcase: unknown;
    prompts: unknown[];
  };
  library: {
    diary: unknown[];
    favorites: unknown[];
    wantToListen: unknown[];
    collection: unknown[];
    wanted: unknown[];
    followedArtists: unknown[];
  };
  activity: { ratings: unknown[]; reviews: unknown[]; comments: unknown[] };
  lists: { owned: unknown[]; saved: unknown[]; pinned: unknown[] };
  highlights: { ratings: unknown[]; diaryEntries: unknown[] };
  social: {
    followers: { username: string | null; deactivated: boolean; status: string }[];
    following: { username: string | null; deactivated: boolean; status: string }[];
    blocked: { username: string | null; deactivated: boolean }[];
  };
  catalog: {
    artists: Record<string, string>;
    releaseGroups: Record<string, string>;
    recordings: Record<string, string>;
  };
}

function collectRefs(rows: CatalogRefs[], into: { artists: Set<string>; releaseGroups: Set<string>; recordings: Set<string> }) {
  for (const row of rows) {
    if (row.artistId) into.artists.add(row.artistId);
    if (row.releaseGroupId) into.releaseGroups.add(row.releaseGroupId);
    if (row.recordingId) into.recordings.add(row.recordingId);
  }
}

// Un usuario ajeno se exporta por su nombre público; una cuenta desactivada, sin nombre.
const person = (row: { username: string; deactivatedAt: Date | null }) => ({
  username: row.deactivatedAt === null ? row.username : null,
  deactivated: row.deactivatedAt !== null,
});

export async function buildDataExport(userId: string, now: Date = new Date()): Promise<DataExport> {
  const [user] = await db.select().from(appUser).where(eq(appUser.id, userId)).limit(1);
  if (!user) throw new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado");

  const own = <T>(rows: Promise<T[]>) => rows;

  const [
    links,
    pinned,
    [showcase],
    prompts,
    diary,
    favorites,
    wantToListen,
    collection,
    wanted,
    followedArtists,
    ratings,
    reviews,
    comments,
    ownedLists,
    savedLists,
    pinnedLists,
    ratingHighlights,
    diaryHighlights,
    followers,
    following,
    blocked,
  ] = await Promise.all([
    own(db.select().from(userProfileLink).where(eq(userProfileLink.userId, userId)).orderBy(asc(userProfileLink.position))),
    own(db.select().from(userPinnedItem).where(eq(userPinnedItem.userId, userId)).orderBy(asc(userPinnedItem.position))),
    db.select().from(userShowcase).where(eq(userShowcase.userId, userId)),
    own(db.select().from(userProfilePrompt).where(eq(userProfilePrompt.userId, userId)).orderBy(asc(userProfilePrompt.position))),
    // El diario se exporta COMPLETO, con las notas privadas: es dato propio.
    own(db.select().from(listenEntry).where(eq(listenEntry.userId, userId)).orderBy(asc(listenEntry.createdAt))),
    own(db.select().from(favorite).where(eq(favorite.userId, userId)).orderBy(asc(favorite.createdAt))),
    own(db.select().from(wantToListenEntry).where(eq(wantToListenEntry.userId, userId)).orderBy(asc(wantToListenEntry.createdAt))),
    own(db.select().from(collectionEntry).where(eq(collectionEntry.userId, userId)).orderBy(asc(collectionEntry.createdAt))),
    own(db.select().from(wantedEntry).where(eq(wantedEntry.userId, userId)).orderBy(asc(wantedEntry.createdAt))),
    own(db.select().from(artistFollow).where(eq(artistFollow.userId, userId)).orderBy(asc(artistFollow.createdAt))),
    own(db.select().from(rating).where(eq(rating.userId, userId)).orderBy(asc(rating.createdAt))),
    // Reseñas y comentarios sin las columnas de auditoría de moderación (quién moderó).
    own(
      db
        .select({
          id: review.id,
          artistId: review.artistId,
          releaseGroupId: review.releaseGroupId,
          recordingId: review.recordingId,
          title: review.title,
          body: review.body,
          moderationStatus: review.moderationStatus,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
        })
        .from(review)
        .where(eq(review.userId, userId))
        .orderBy(asc(review.createdAt)),
    ),
    own(
      db
        .select({
          id: comment.id,
          artistId: comment.artistId,
          releaseGroupId: comment.releaseGroupId,
          recordingId: comment.recordingId,
          body: comment.body,
          moderationStatus: comment.moderationStatus,
          createdAt: comment.createdAt,
        })
        .from(comment)
        .where(eq(comment.userId, userId))
        .orderBy(asc(comment.createdAt)),
    ),
    own(
      db
        .select({
          id: userList.id,
          entityType: userList.entityType,
          title: userList.title,
          description: userList.description,
          audience: userList.audience,
          kind: userList.kind,
          journeyArtistId: userList.journeyArtistId,
          createdAt: userList.createdAt,
          updatedAt: userList.updatedAt,
        })
        .from(userList)
        .where(eq(userList.ownerId, userId))
        .orderBy(asc(userList.createdAt)),
    ),
    own(db.select().from(listSave).where(eq(listSave.saverId, userId)).orderBy(asc(listSave.createdAt))),
    own(db.select().from(userListPin).where(eq(userListPin.ownerId, userId))),
    own(db.select().from(ratingHighlight).where(eq(ratingHighlight.userId, userId))),
    own(db.select().from(listenEntryHighlight).where(eq(listenEntryHighlight.userId, userId))),
    // Seguidores, seguidos y bloqueados: solo el usuario público de la otra persona.
    db
      .select({ username: appUser.username, deactivatedAt: appUser.deactivatedAt, status: userFollow.status })
      .from(userFollow)
      .innerJoin(appUser, eq(userFollow.followerId, appUser.id))
      .where(eq(userFollow.followedId, userId))
      .orderBy(asc(appUser.username)),
    db
      .select({ username: appUser.username, deactivatedAt: appUser.deactivatedAt, status: userFollow.status })
      .from(userFollow)
      .innerJoin(appUser, eq(userFollow.followedId, appUser.id))
      .where(eq(userFollow.followerId, userId))
      .orderBy(asc(appUser.username)),
    db
      .select({ username: appUser.username, deactivatedAt: appUser.deactivatedAt })
      .from(userBlock)
      .innerJoin(appUser, eq(userBlock.blockedId, appUser.id))
      .where(eq(userBlock.blockerId, userId))
      .orderBy(asc(appUser.username)),
  ]);

  const listIds = ownedLists.map((list) => list.id);
  const items = listIds.length
    ? await db.select().from(userListItem).where(inArray(userListItem.listId, listIds)).orderBy(asc(userListItem.position))
    : [];

  // Diccionario de nombres del catálogo para todo lo referenciado.
  const refs = { artists: new Set<string>(), releaseGroups: new Set<string>(), recordings: new Set<string>() };
  for (const rows of [diary, favorites, wantToListen, collection, wanted, ratings, reviews, comments, items, pinned]) {
    collectRefs(rows as CatalogRefs[], refs);
  }
  collectRefs(followedArtists.map((row) => ({ artistId: row.artistId })), refs);
  collectRefs(ownedLists.map((list) => ({ artistId: list.journeyArtistId })), refs);
  if (showcase?.anthemRecordingId) refs.recordings.add(showcase.anthemRecordingId);
  if (showcase?.definingArtistId) refs.artists.add(showcase.definingArtistId);
  if (showcase?.definingReleaseGroupId) refs.releaseGroups.add(showcase.definingReleaseGroupId);

  const [artists, releaseGroups, recordings] = await Promise.all([
    refs.artists.size ? db.select({ id: artist.id, name: artist.name }).from(artist).where(inArray(artist.id, [...refs.artists])) : [],
    refs.releaseGroups.size
      ? db.select({ id: releaseGroup.id, title: releaseGroup.title }).from(releaseGroup).where(inArray(releaseGroup.id, [...refs.releaseGroups]))
      : [],
    refs.recordings.size ? db.select({ id: recording.id, title: recording.title }).from(recording).where(inArray(recording.id, [...refs.recordings])) : [],
  ]);

  return {
    version: DATA_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    // Perfil y preferencias propios. NUNCA `password_hash`.
    account: {
      username: user.username,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      displayName: user.displayName,
      profileVisibility: user.profileVisibility,
      defaultAudience: user.defaultAudience,
      locale: user.locale,
      bio: user.bio,
      pronouns: user.pronouns,
      pronounSet: user.pronounSet,
      country: user.country,
      location: user.location,
      timezone: user.timezone,
      showLocalTime: user.showLocalTime,
      selfRoles: user.selfRoles,
      genres: user.genres,
      listeningFormats: user.listeningFormats,
      avatarUrl: user.avatarImageId ? imageService.resolveUrl(user.avatarImageId) : null,
      memberSince: user.createdAt,
    },
    profile: { links, pinned, showcase: showcase ?? null, prompts },
    library: { diary, favorites, wantToListen, collection, wanted, followedArtists },
    activity: { ratings, reviews, comments },
    lists: {
      owned: ownedLists.map((list) => ({ ...list, items: items.filter((item) => item.listId === list.id) })),
      saved: savedLists,
      pinned: pinnedLists,
    },
    highlights: { ratings: ratingHighlights, diaryEntries: diaryHighlights },
    social: {
      followers: followers.map((row) => ({ ...person(row), status: row.status })),
      following: following.map((row) => ({ ...person(row), status: row.status })),
      blocked: blocked.map((row) => person(row)),
    },
    catalog: {
      artists: Object.fromEntries(artists.map((row) => [row.id, row.name])),
      releaseGroups: Object.fromEntries(releaseGroups.map((row) => [row.id, row.title])),
      recordings: Object.fromEntries(recordings.map((row) => [row.id, row.title])),
    },
  };
}
