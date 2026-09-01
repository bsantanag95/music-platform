// Mirror en TypeScript del esquema definido en drizzle/0000_initial.sql.
//
// Importante (ver docs/02-architecture/adr/0005-orm-drizzle-migraciones-sql.md):
// este archivo NO es la fuente de las migraciones. Las migraciones son SQL
// crudo escrito a mano (empezando por 0000_initial.sql), porque incluyen
// triggers y CHECK constraints multi-columna que Drizzle no puede generar
// de forma declarativa. Este schema.ts existe para dar autocompletado y
// tipado en las queries de la aplicación, y debe mantenerse sincronizado
// a mano con cada migración nueva.

import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  numeric,
  timestamp,
  date,
  check,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const appUser = pgTable(
  "app_user",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    displayName: text("display_name"),
    passwordHash: text("password_hash"),
    profileVisibility: text("profile_visibility").notNull().default("public"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "chk_app_user_profile_visibility",
      sql`${t.profileVisibility} IN ('public','private')`,
    ),
  ],
);

export const session = pgTable(
  "session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("uq_session_token_hash").on(t.tokenHash),
    index("idx_session_user").on(t.userId),
    index("idx_session_expires_at").on(t.expiresAt),
  ],
);

export const authIdentity = pgTable(
  "auth_identity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_auth_identity_provider_account").on(t.provider, t.providerAccountId),
    index("idx_auth_identity_user").on(t.userId),
  ],
);

export const userFollow = pgTable(
  "user_follow",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    followedId: uuid("followed_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // 'pending' | 'accepted'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_user_follow_pair").on(t.followerId, t.followedId),
    index("idx_user_follow_followed").on(t.followedId),
    check("chk_user_follow_not_self", sql`${t.followerId} <> ${t.followedId}`),
    check("chk_user_follow_status", sql`${t.status} IN ('pending','accepted')`),
  ],
);

export const userBlock = pgTable(
  "user_block",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_user_block_pair").on(t.blockerId, t.blockedId),
    index("idx_user_block_blocked").on(t.blockedId),
    check("chk_user_block_not_self", sql`${t.blockerId} <> ${t.blockedId}`),
  ],
);

export const artist = pgTable(
  "artist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mbid: uuid("mbid").unique(),
    type: text("type").notNull(), // 'person' | 'group' | 'various'
    name: text("name").notNull(),
    bio: text("bio"),
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    discographySyncedAt: timestamp("discography_synced_at", { withTimezone: true }),
    membershipsSyncedAt: timestamp("memberships_synced_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_artist_name").on(t.name),
    check("chk_artist_type", sql`${t.type} IN ('person','group','various','unknown')`),
  ],
);

export const membership = pgTable(
  "membership",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    personId: uuid("person_id")
      .notNull()
      .references(() => artist.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => artist.id, { onDelete: "cascade" }),
    role: text("role"),
    joinedOn: date("joined_on"),
    leftOn: date("left_on"),
  },
  (t) => [
    index("idx_membership_person").on(t.personId),
    index("idx_membership_group").on(t.groupId),
    uniqueIndex("uq_membership_person_group").on(t.personId, t.groupId),
    check("chk_membership_not_self", sql`${t.personId} <> ${t.groupId}`),
    // La validación de que person_id sea type='person' y group_id sea
    // type='group' vive en el trigger trg_membership_types (ver migración),
    // no se puede expresar como CHECK porque requiere consultar otra tabla.
  ],
);

export const releaseGroup = pgTable("release_group", {
  id: uuid("id").defaultRandom().primaryKey(),
  mbid: uuid("mbid").unique(),
  title: text("title").notNull(),
  category: text("category").notNull(), // 'studio' | 'single_ep' | 'compilation' | 'live_other'
  coverThumbUrl: text("cover_thumb_url"), // única fuente escribible de la carátula
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const release = pgTable(
  "release",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mbid: uuid("mbid").unique(),
    releaseGroupId: uuid("release_group_id")
      .notNull()
      .references(() => releaseGroup.id, { onDelete: "cascade" }),
    editionLabel: text("edition_label").notNull().default("original"),
    releaseDate: date("release_date"),
    coverThumbUrl: text("cover_thumb_url"),
    creditsSyncedAt: timestamp("credits_synced_at", { withTimezone: true }),
  },
  (t) => [index("idx_release_release_group").on(t.releaseGroupId)],
);

export const recording = pgTable(
  "recording",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mbid: uuid("mbid").unique(),
    title: text("title").notNull(),
    durationSec: integer("duration_sec"),
    variantType: text("variant_type").notNull().default("original"), // original | re_recording | remix | live
    variantOfId: uuid("variant_of_id"),
  },
  (t) => [
    index("idx_recording_title").on(t.title),
    index("idx_recording_variant_of").on(t.variantOfId),
    check(
      "chk_recording_variant_type",
      sql`${t.variantType} IN ('original','re_recording','remix','live')`,
    ),
  ],
);

export const track = pgTable(
  "track",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseId: uuid("release_id")
      .notNull()
      .references(() => release.id, { onDelete: "cascade" }),
    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recording.id, { onDelete: "restrict" }),
    discNumber: integer("disc_number").notNull().default(1),
    position: integer("position").notNull(),
  },
  (t) => [
    uniqueIndex("uq_track_release_disc_position").on(t.releaseId, t.discNumber, t.position),
    index("idx_track_recording").on(t.recordingId),
  ],
);

export const credit = pgTable(
  "credit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artist.id, { onDelete: "cascade" }),
    releaseGroupId: uuid("release_group_id").references(() => releaseGroup.id, {
      onDelete: "cascade",
    }),
    recordingId: uuid("recording_id").references(() => recording.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    role: text("role").notNull(), // 'primary' | 'featured'
    joinPhrase: text("join_phrase"),
  },
  (t) => [
    index("idx_credit_artist").on(t.artistId),
    check("chk_credit_role", sql`${t.role} IN ('primary','featured')`),
    check(
      "chk_credit_single_target",
      sql`num_nonnulls(${t.releaseGroupId}, ${t.recordingId}) = 1`,
    ),
    // Los índices únicos parciales (uq_credit_pos_*, uq_credit_artist_*) se
    // definen en la migración SQL cruda — Drizzle no expresa bien índices
    // parciales sobre columnas nullable en este mirror.
  ],
);

export const rating = pgTable(
  "rating",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id").references(() => artist.id, { onDelete: "cascade" }),
    releaseGroupId: uuid("release_group_id").references(() => releaseGroup.id, {
      onDelete: "cascade",
    }),
    recordingId: uuid("recording_id").references(() => recording.id, { onDelete: "cascade" }),
    stars: numeric("stars", { precision: 2, scale: 1 }).notNull(),
    detailedScore: smallint("detailed_score"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_rating_recording").on(t.recordingId),
    index("idx_rating_release_group").on(t.releaseGroupId),
    index("idx_rating_artist").on(t.artistId),
    check(
      "chk_rating_single_target",
      sql`num_nonnulls(${t.artistId}, ${t.releaseGroupId}, ${t.recordingId}) = 1`,
    ),
    // La coherencia estrellas <-> valoración detallada y el paso de 0.5 en
    // estrellas se definen como CHECK en la migración SQL cruda: son
    // expresiones matemáticas que se mantienen ahí como fuente única de
    // verdad en vez de duplicarlas aquí con riesgo de que se desincronicen.
  ],
);

export type ArtistRow = typeof artist.$inferSelect;
export type AppUserRow = typeof appUser.$inferSelect;
export type SessionRow = typeof session.$inferSelect;
export type AuthIdentityRow = typeof authIdentity.$inferSelect;
export type UserFollowRow = typeof userFollow.$inferSelect;
export type UserBlockRow = typeof userBlock.$inferSelect;
export type ReleaseGroupRow = typeof releaseGroup.$inferSelect;
export type ReleaseRow = typeof release.$inferSelect;
export type RecordingRow = typeof recording.$inferSelect;
export type TrackRow = typeof track.$inferSelect;
export type CreditRow = typeof credit.$inferSelect;
export type CommentRow = typeof comment.$inferSelect;
export type ListenEntryRow = typeof listenEntry.$inferSelect;

export const favorite = pgTable(
  "favorite",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id").references(() => artist.id, { onDelete: "cascade" }),
    releaseGroupId: uuid("release_group_id").references(() => releaseGroup.id, {
      onDelete: "cascade",
    }),
    recordingId: uuid("recording_id").references(() => recording.id, { onDelete: "cascade" }),
    audience: text("audience").notNull().default("followers"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_favorite_user_created").on(t.userId, t.createdAt),
    index("idx_favorite_artist").on(t.artistId),
    index("idx_favorite_release_group").on(t.releaseGroupId),
    index("idx_favorite_recording").on(t.recordingId),
    check(
      "chk_favorite_single_target",
      sql`num_nonnulls(${t.artistId}, ${t.releaseGroupId}, ${t.recordingId}) = 1`,
    ),
  ],
);

export const userList = pgTable(
  "user_list",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    audience: text("audience").notNull().default("followers"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_user_list_owner_created").on(t.ownerId, t.createdAt),
    index("idx_user_list_owner_audience").on(t.ownerId, t.audience),
    check(
      "chk_user_list_entity_type",
      sql`${t.entityType} IN ('artist', 'release-group', 'recording')`,
    ),
    check("chk_user_list_title", sql`length(${t.title}) <= 100`),
    check("chk_user_list_description", sql`${t.description} IS NULL OR length(${t.description}) <= 500`),
  ],
);

export const userListItem = pgTable(
  "user_list_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => userList.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id").references(() => artist.id, { onDelete: "cascade" }),
    releaseGroupId: uuid("release_group_id").references(() => releaseGroup.id, {
      onDelete: "cascade",
    }),
    recordingId: uuid("recording_id").references(() => recording.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_user_list_item_list").on(t.listId, t.position),
    check(
      "chk_user_list_item_single_target",
      sql`num_nonnulls(${t.artistId}, ${t.releaseGroupId}, ${t.recordingId}) = 1`,
    ),
  ],
);

export type FavoriteRow = typeof favorite.$inferSelect;
export type UserListRow = typeof userList.$inferSelect;
export type UserListItemRow = typeof userListItem.$inferSelect;

// Colección física (Fase 5, add-physical-collection). Objetivo fijo (álbum):
// FK directa, sin patrón CHECK num_nonnulls. Varias entradas por álbum
// permitidas (sin índice único). El CHECK del vocabulario de `attributes` y
// el trigger de `updatedAt` (más el índice GIN sobre `attributes`) viven en
// la migración SQL cruda.
export const collectionEntry = pgTable(
  "collection_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    releaseGroupId: uuid("release_group_id")
      .notNull()
      .references(() => releaseGroup.id, { onDelete: "cascade" }),
    format: text("format").notNull(),
    attributes: text("attributes")
      .array()
      .notNull()
      .default(sql`'{}'`),
    note: text("note"),
    audience: text("audience").notNull().default("followers"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_collection_entry_user_created").on(t.userId, t.createdAt),
    index("idx_collection_entry_user_release_group").on(t.userId, t.releaseGroupId),
    index("idx_collection_entry_release_group").on(t.releaseGroupId),
    check("chk_collection_entry_format", sql`${t.format} IN ('vinyl', 'cd', 'cassette', 'other')`),
    check(
      "chk_collection_entry_audience",
      sql`${t.audience} IN ('private', 'followers', 'public')`,
    ),
    check("chk_collection_entry_note", sql`${t.note} IS NULL OR length(${t.note}) <= 140`),
  ],
);

export type CollectionEntryRow = typeof collectionEntry.$inferSelect;

export const comment = pgTable(
  "comment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id").references(() => artist.id, { onDelete: "cascade" }),
    releaseGroupId: uuid("release_group_id").references(() => releaseGroup.id, {
      onDelete: "cascade",
    }),
    recordingId: uuid("recording_id").references(() => recording.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_comment_recording").on(t.recordingId),
    index("idx_comment_release_group").on(t.releaseGroupId),
    index("idx_comment_artist").on(t.artistId),
    check(
      "chk_comment_single_target",
      sql`num_nonnulls(${t.artistId}, ${t.releaseGroupId}, ${t.recordingId}) = 1`,
    ),
  ],
);

export const listenEntry = pgTable(
  "listen_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id").references(() => artist.id, { onDelete: "cascade" }),
    releaseGroupId: uuid("release_group_id").references(() => releaseGroup.id, {
      onDelete: "cascade",
    }),
    recordingId: uuid("recording_id").references(() => recording.id, { onDelete: "cascade" }),
    listenContext: text("listen_context").notNull(), // 'first_listen' | 'relisten' | 'rediscovery'
    body: text("body"),
    reaction: text("reaction"), // 'liked' | 'loved' | 'obsessed' | 'neutral' | 'disliked'
    audience: text("audience").notNull().default("followers"), // 'private' | 'followers' | 'public'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_listen_entry_user_created").on(t.userId, t.createdAt),
    index("idx_listen_entry_artist").on(t.artistId),
    index("idx_listen_entry_release_group").on(t.releaseGroupId),
    index("idx_listen_entry_recording").on(t.recordingId),
    check(
      "chk_listen_entry_single_target",
      sql`num_nonnulls(${t.artistId}, ${t.releaseGroupId}, ${t.recordingId}) = 1`,
    ),
    // El CHECK de contexto, reacción, audiencia y límite de body viven en la
    // migración SQL cruda (fuente única de verdad, mismo criterio que rating).
  ],
);
