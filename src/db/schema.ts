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

export const appUser = pgTable("app_user", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
export type ReleaseGroupRow = typeof releaseGroup.$inferSelect;
export type ReleaseRow = typeof release.$inferSelect;
export type RecordingRow = typeof recording.$inferSelect;
export type TrackRow = typeof track.$inferSelect;
export type CreditRow = typeof credit.$inferSelect;

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
