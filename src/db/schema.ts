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
  boolean,
  timestamp,
  date,
  check,
  primaryKey,
  unique,
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
    // Identidad extendida del perfil (cambio redesign-user-profile). Todas
    // opcionales. La identidad visual es la foto de perfil subida cuando
    // existe, y el monograma determinista por username como fallback.
    bio: text("bio"),
    pronouns: text("pronouns"),
    location: text("location"),
    // Datos personales opcionales (migración 0042, cambio profile-personal-info).
    // `country` es un código ISO de dos letras y `pronoun_set` una clave de la lista
    // cerrada; ambas listas viven en `src/lib/personal-info.ts`. `pronouns` pasa a
    // ser el texto libre de "Otro" y `location` la ciudad o región.
    country: text("country"),
    pronounSet: text("pronoun_set"),
    timezone: text("timezone"),
    // Foto de perfil (migración 0045, openspec: connect-avatar-upload).
    // Referencia a `image(id)` con `ON DELETE SET NULL`: la aplicación borra
    // el archivo y la fila `image` deliberadamente (reemplazo, eliminación
    // de cuenta); el `SET NULL` es defensa para el borrado directo de una
    // fila `image` sin pasar por la capa de aplicación.
    avatarImageId: uuid("avatar_image_id"),
    // Onboarding de dos puertas (migración 0020, cambio add-two-door-onboarding).
    // Nulo = pendiente; se fija al completar o saltar /welcome. Los usuarios
    // previos a la migración quedan con onboarded_at = created_at.
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    // Verificación de email (migración 0033, change add-email-verification).
    // Nulo = sin verificar; el backfill marca verificadas las cuentas previas.
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    // Audiencia por defecto del contenido nuevo (migración 0034, cambio
    // rework-owner-management). Nulo = "según el tipo": cada tipo conserva su
    // propio default. Nunca se aplica a contenido ya creado.
    defaultAudience: text("default_audience"),
    // Cambio de usuario (migración 0039, change rework-account-settings): fecha
    // del último cambio (nulo = nunca), base del enfriamiento de 30 días.
    usernameChangedAt: timestamp("username_changed_at", { withTimezone: true }),
    // Idioma preferido de la interfaz (migración 0039). Nulo = sin preferencia.
    locale: text("locale"),
    // Identidad musical (migración 0040, change rework-account-settings): listas
    // cerradas guardadas como claves estables y validadas en la aplicación
    // (src/lib/music-identity.ts). La base solo garantiza los topes.
    selfRoles: text("self_roles").array().notNull().default(sql`'{}'::text[]`),
    genres: text("genres").array().notNull().default(sql`'{}'::text[]`),
    listeningFormats: text("listening_formats").array().notNull().default(sql`'{}'::text[]`),
    // Mostrar la hora local en la Placa; exige `timezone`.
    showLocalTime: boolean("show_local_time").notNull().default(false),
    // Cuenta desactivada (migración 0041, capability account-lifecycle). Nulo =
    // activa. Una cuenta desactivada no tiene sesiones y desaparece para las demás
    // personas, pero conserva su contenido; se reactiva al iniciar sesión.
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_app_user_locale", sql`${t.locale} IS NULL OR ${t.locale} IN ('es','en')`),
    check("chk_app_user_self_roles", sql`cardinality(${t.selfRoles}) <= 3`),
    check("chk_app_user_genres", sql`cardinality(${t.genres}) <= 5`),
    check("chk_app_user_listening_formats", sql`cardinality(${t.listeningFormats}) <= 5`),
    check("chk_app_user_local_time", sql`NOT ${t.showLocalTime} OR ${t.timezone} IS NOT NULL`),
    check(
      "chk_app_user_profile_visibility",
      sql`${t.profileVisibility} IN ('public','private')`,
    ),
    check(
      "chk_app_user_default_audience",
      sql`${t.defaultAudience} IS NULL OR ${t.defaultAudience} IN ('private','followers','public')`,
    ),
    check("chk_app_user_bio", sql`${t.bio} IS NULL OR length(${t.bio}) <= 200`),
    check("chk_app_user_pronouns", sql`${t.pronouns} IS NULL OR length(${t.pronouns}) <= 40`),
    check("chk_app_user_location", sql`${t.location} IS NULL OR length(${t.location}) <= 80`),
    check("chk_app_user_country", sql`${t.country} IS NULL OR ${t.country} ~ '^[A-Z]{2}$'`),
    check("chk_app_user_pronouns_exclusive", sql`${t.pronounSet} IS NULL OR ${t.pronouns} IS NULL`),
    check("chk_app_user_timezone", sql`${t.timezone} IS NULL OR length(${t.timezone}) <= 64`),
  ],
);

export const userRole = pgTable(
  "user_role",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    grantedBy: uuid("granted_by").references(() => appUser.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_user_role_user_role").on(t.userId, t.role),
    index("idx_user_role_user").on(t.userId),
    check("chk_user_role_role", sql`${t.role} IN ('moderator', 'admin', 'editorial_curator')`),
  ],
);

export const userRestriction = pgTable(
  "user_restriction",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    reason: text("reason").notNull(),
    createdBy: uuid("created_by").references(() => appUser.id, { onDelete: "set null" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => appUser.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_user_restriction_active").on(t.userId, t.scope, t.startsAt, t.expiresAt),
    check("chk_user_restriction_scope", sql`${t.scope} IN ('social_activity')`),
  ],
);

export const contentReport = pgTable(
  "content_report",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id"),
    reviewId: uuid("review_id"),
    userId: uuid("user_id").references(() => appUser.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: text("status").notNull().default("pending"),
    resolvedBy: uuid("resolved_by").references(() => appUser.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_content_report_status_created").on(t.status, t.createdAt),
    check("chk_content_report_status", sql`${t.status} IN ('pending', 'resolved', 'dismissed')`),
    check("chk_content_report_target", sql`num_nonnulls(${t.commentId}, ${t.reviewId}, ${t.userId}) = 1`),
  ],
);

export const moderationAction = pgTable(
  "moderation_action",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    commentId: uuid("comment_id"),
    reviewId: uuid("review_id"),
    listId: uuid("list_id"),
    restrictionId: uuid("restriction_id"),
    userId: uuid("user_id"),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_moderation_action_created").on(t.createdAt),
    check(
      "chk_moderation_action_action",
      sql`${t.action} IN ('hide', 'restore', 'report_resolve', 'report_dismiss', 'suspend_social', 'revoke_social')`,
    ),
    check(
      "chk_moderation_action_target",
      sql`num_nonnulls(${t.commentId}, ${t.reviewId}, ${t.listId}, ${t.restrictionId}, ${t.userId}) <= 1`,
    ),
  ],
);

export const userRoleAction = pgTable(
  "user_role_action",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "restrict" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_user_role_action_target").on(t.targetId, t.createdAt),
    check("chk_user_role_action_role", sql`${t.role} IN ('moderator', 'admin', 'editorial_curator')`),
    check("chk_user_role_action_action", sql`${t.action} IN ('grant', 'revoke')`),
  ],
);

// Auditoría de autoría editorial (migración 0025, cambio
// add-editorial-curator-role). Registra cada acción del flujo editorial;
// el FK cascade a user_list es deliberado (borrar un borrador nunca
// publicado elimina su historial, que no tiene nada público que auditar).
export const editorialAction = pgTable(
  "editorial_action",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listId: uuid("list_id")
      .notNull()
      .references(() => userList.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_editorial_action_list").on(t.listId, t.createdAt),
    check(
      "chk_editorial_action_action",
      sql`${t.action} IN ('create', 'edit', 'submit', 'publish', 'withdraw')`,
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
    // Etiqueta legible del dispositivo ("Chrome · Windows") y última actividad
    // (migración 0039, change rework-account-settings). Nunca se guarda el
    // User-Agent completo ni la IP. Nulos en las sesiones previas.
    deviceLabel: text("device_label"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [
    check("chk_session_device_label", sql`${t.deviceLabel} IS NULL OR length(${t.deviceLabel}) <= 80`),
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

// Token de restablecimiento de contraseña (migración 0031, change
// add-password-reset). Igual que `session`, guarda solo el hash del token
// opaco; el token en claro únicamente viaja en el link del correo. El single-use
// se garantiza con borrado físico: no hay columna `used_at`.
export const passwordResetToken = pgTable(
  "password_reset_token",
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
    uniqueIndex("uq_password_reset_token_hash").on(t.tokenHash),
    uniqueIndex("uq_password_reset_token_user").on(t.userId),
    index("idx_password_reset_token_expires_at").on(t.expiresAt),
  ],
);

// Token de verificación de email (migración 0033, change
// add-email-verification). Misma mecánica que `password_reset_token`: hash del
// token opaco, single-use por borrado físico y un solo token vigente por
// usuario (`uq_email_verification_token_user` + INSERT ... ON CONFLICT).
export const emailVerificationToken = pgTable(
  "email_verification_token",
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
    uniqueIndex("uq_email_verification_token_hash").on(t.tokenHash),
    uniqueIndex("uq_email_verification_token_user").on(t.userId),
    index("idx_email_verification_token_expires_at").on(t.expiresAt),
  ],
);

// Usuario anterior reservado 30 días tras un cambio de usuario (migración 0039,
// capability account-username). El índice único es sobre lower(username): la
// disponibilidad no distingue mayúsculas. Los alias vencidos no se consultan.
export const usernameAlias = pgTable(
  "username_alias",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("uq_username_alias_lower").on(sql`lower(${t.username})`),
    index("idx_username_alias_user").on(t.userId),
    index("idx_username_alias_expires_at").on(t.expiresAt),
  ],
);

// Cambio de email pendiente de confirmar (migración 0039, capability
// account-credentials). Igual que `email_verification_token`: solo el hash del
// token, un cambio vigente por usuario y borrado físico al confirmar.
export const emailChangeToken = pgTable(
  "email_change_token",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    newEmail: text("new_email").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("uq_email_change_token_hash").on(t.tokenHash),
    uniqueIndex("uq_email_change_token_user").on(t.userId),
    index("idx_email_change_token_expires_at").on(t.expiresAt),
  ],
);

// Preguntas del perfil (migración 0040, capability profile-music-identity): hasta
// 3 por usuario, una línea cada una. `position` 0..2 único por usuario hace que
// la base impida una cuarta; `prompt_key` es de una lista cerrada validada en la
// aplicación. El conjunto se reemplaza completo al guardar.
export const userProfilePrompt = pgTable(
  "user_profile_prompt",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    promptKey: text("prompt_key").notNull(),
    answer: text("answer").notNull(),
    position: smallint("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_user_profile_prompt_position", sql`${t.position} BETWEEN 0 AND 2`),
    check(
      "chk_user_profile_prompt_answer",
      sql`char_length(${t.answer}) BETWEEN 1 AND 100 AND ${t.answer} !~ E'[\r\n]'`,
    ),
    unique("uq_user_profile_prompt_key").on(t.userId, t.promptKey),
    unique("uq_user_profile_prompt_position").on(t.userId, t.position),
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

export const releaseGroup = pgTable(
  "release_group",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mbid: uuid("mbid").unique(),
    title: text("title").notNull(),
    category: text("category").notNull(), // 'studio' | 'single_ep' | 'compilation' | 'live_other'
    coverThumbUrl: text("cover_thumb_url"), // única fuente escribible de la carátula
    // Fecha de lanzamiento canónica del release-group (migración 0016):
    // derivada de `first-release-date` de MusicBrainz sobre TODAS las
    // ediciones, no de la edición ingerida. `firstReleaseDate` solo se
    // puebla con precisión diaria; `firstReleaseYear` con cualquier año
    // conocido (misma tolerancia que release-date-precision).
    firstReleaseDate: date("first_release_date"),
    firstReleaseYear: smallint("first_release_year"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_release_group_first_year").on(t.firstReleaseYear)],
);

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
    index("idx_rating_user").on(t.userId),
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
export type UserRoleRow = typeof userRole.$inferSelect;
export type UserRestrictionRow = typeof userRestriction.$inferSelect;
export type ContentReportRow = typeof contentReport.$inferSelect;
export type ModerationActionRow = typeof moderationAction.$inferSelect;
export type UserRoleActionRow = typeof userRoleAction.$inferSelect;
export type EditorialActionRow = typeof editorialAction.$inferSelect;
export type SessionRow = typeof session.$inferSelect;
export type AuthIdentityRow = typeof authIdentity.$inferSelect;
export type PasswordResetTokenRow = typeof passwordResetToken.$inferSelect;
export type EmailVerificationTokenRow = typeof emailVerificationToken.$inferSelect;
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

// Señal prospectiva "quiero escuchar" (openspec: add-want-to-listen). Mismo
// patrón de objetivo que `favorite`, pero sin `recordingId`: acotada a
// artista y álbum por decisión de producto. Se retira desde la app (no por
// trigger) cuando el usuario registra una escucha del mismo objetivo — ver
// `createListenEntry` en `src/services/diary/diary.ts`.
export const wantToListenEntry = pgTable(
  "want_to_listen_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id").references(() => artist.id, { onDelete: "cascade" }),
    releaseGroupId: uuid("release_group_id").references(() => releaseGroup.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_want_to_listen_entry_user_created").on(t.userId, t.createdAt),
    index("idx_want_to_listen_entry_artist").on(t.artistId),
    index("idx_want_to_listen_entry_release_group").on(t.releaseGroupId),
    check(
      "chk_want_to_listen_entry_single_target",
      sql`num_nonnulls(${t.artistId}, ${t.releaseGroupId}) = 1`,
    ),
  ],
);
export type WantToListenEntryRow = typeof wantToListenEntry.$inferSelect;

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
    moderationStatus: text("moderation_status").notNull().default("visible"),
    moderatedBy: uuid("moderated_by").references(() => appUser.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    moderationReason: text("moderation_reason"),
isOfficial: boolean("is_official").notNull().default(false),
    officialPublishedBy: uuid("official_published_by").references(() => appUser.id, { onDelete: "set null" }),
    officialPublishedAt: timestamp("official_published_at", { withTimezone: true }),
    officialWithdrawnAt: timestamp("official_withdrawn_at", { withTimezone: true }),
    // Autoría editorial (migración 0025, cambio add-editorial-curator-role).
    // El owner de una lista editorial sigue siendo @exploracion; estas columnas
    // registran qué persona la creó y quién/cuándo la propuso para publicación.
    editorialAuthorId: uuid("editorial_author_id").references(() => appUser.id, {
      onDelete: "set null",
    }),
    editorialSubmittedAt: timestamp("editorial_submitted_at", { withTimezone: true }),
    editorialSubmittedBy: uuid("editorial_submitted_by").references(() => appUser.id, {
      onDelete: "set null",
    }),
    // Subtipo "recorrido de artista" (migración 0027, cambio add-artist-journey).
    // `kind = 'artist_journey'` reutiliza esta misma tabla/ítems para la
    // selección personal de discografía; `journeyArtistId`/`journeyArchivedAt`
    // solo se usan en ese subtipo. `kind = 'custom_journey'` (migración 0043,
    // cambio add-camino) es un "Camino" dinámico: mismo mecanismo, sin
    // artista ni discografía de fondo. En ambos subtipos el estado
    // "completo"/"en curso" NO se persiste — se deriva en el momento de
    // lectura contra `listen_entry` (ver src/services/journeys/progress.ts),
    // así nunca queda desincronizado al agregar o quitar un ítem.
    kind: text("kind").notNull().default("standard"),
    journeyArtistId: uuid("journey_artist_id").references(() => artist.id, { onDelete: "cascade" }),
    journeyArchivedAt: timestamp("journey_archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_user_list_owner_created").on(t.ownerId, t.createdAt),
    index("idx_user_list_owner_audience").on(t.ownerId, t.audience),
    // Índice único parcial (owner_id, journey_artist_id) WHERE kind =
    // 'artist_journey' definido en la migración SQL cruda — Drizzle no expresa
    // bien índices parciales (mismo criterio que uq_credit_pos_*).
    index("idx_user_list_journey_artist").on(t.journeyArtistId),
    check(
      "chk_user_list_entity_type",
      sql`${t.entityType} IN ('artist', 'release-group', 'recording')`,
    ),
    check("chk_user_list_title", sql`length(${t.title}) <= 100`),
    check("chk_user_list_description", sql`${t.description} IS NULL OR length(${t.description}) <= 500`),
    check("chk_user_list_moderation_status", sql`${t.moderationStatus} IN ('visible', 'hidden')`),
    check("chk_user_list_kind", sql`${t.kind} IN ('standard', 'artist_journey', 'custom_journey')`),
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

// Guardar / seguir listas ajenas (cambio rework-lists-section). Marcador
// privado por (saver_id, list_id); `following` habilita que las
// actualizaciones de la lista entren en el feed de quien la sigue.
// `tracking` (migración 0043, cambio add-camino) es un eje independiente:
// el propio guardador activa su seguimiento de progreso sobre una lista
// ajena de álbumes, sin que el dueño opine ni se entere — el progreso nunca
// se persiste, se deriva en lectura (ver src/services/journeys/progress.ts).
export const listSave = pgTable(
  "list_save",
  {
    saverId: uuid("saver_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => userList.id, { onDelete: "cascade" }),
    following: boolean("following").notNull().default(false),
    tracking: boolean("tracking").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.saverId, t.listId] }),
    index("idx_list_save_saver_created").on(t.saverId, t.createdAt),
    index("idx_list_save_list").on(t.listId),
    index("idx_list_save_saver_tracking").on(t.saverId).where(sql`${t.tracking}`),
    index("idx_list_save_list_tracking").on(t.listId).where(sql`${t.tracking}`),
  ],
);

// Fijar listas propias (cambio rework-lists-section). Tabla aparte para no
// tocar user_list.updated_at (que dispara eventos de feed).
export const userListPin = pgTable(
  "user_list_pin",
  {
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    listId: uuid("list_id")
      .notNull()
      .references(() => userList.id, { onDelete: "cascade" }),
    pinnedAt: timestamp("pinned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.listId] }),
    index("idx_user_list_pin_owner_pinned").on(t.ownerId, t.pinnedAt),
  ],
);

// Colecciones destacadas del descubrimiento `/explore` (migración 0018,
// openspec: add-album-discovery). Tabla aparte —mismo motivo que
// user_list_pin—: destacar NO debe tocar user_list.updated_at (que dispara
// eventos de feed). Presencia de fila = destacada; `rank` NOT NULL, UNIQUE,
// > 0 (el CHECK vive en la migración SQL cruda). Las escribe
// scripts/seed-discovery.ts, no una acción de usuario.
export const userListFeatured = pgTable(
  "user_list_featured",
  {
    listId: uuid("list_id")
      .primaryKey()
      .references(() => userList.id, { onDelete: "cascade" }),
    rank: smallint("rank").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_user_list_featured_rank").on(t.rank)],
);

export type FavoriteRow = typeof favorite.$inferSelect;
export type UserListRow = typeof userList.$inferSelect;
export type UserListItemRow = typeof userListItem.$inferSelect;
export type ListSaveRow = typeof listSave.$inferSelect;
export type UserListPinRow = typeof userListPin.$inferSelect;
export type UserListFeaturedRow = typeof userListFeatured.$inferSelect;

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

// Wishlist de colección (Fase 5, add-collection-wishlist). A diferencia de
// collectionEntry, format es nullable ("cualquier formato") y no hay
// audiencia: es privada del dueño, sin vista pública (mismo criterio que
// want_to_listen). Varias entradas por álbum permitidas, sin índice único.
export const wantedEntry = pgTable(
  "wanted_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    releaseGroupId: uuid("release_group_id")
      .notNull()
      .references(() => releaseGroup.id, { onDelete: "cascade" }),
    format: text("format"),
    attributes: text("attributes")
      .array()
      .notNull()
      .default(sql`'{}'`),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_wanted_entry_user_created").on(t.userId, t.createdAt),
    index("idx_wanted_entry_user_release_group").on(t.userId, t.releaseGroupId),
    index("idx_wanted_entry_release_group").on(t.releaseGroupId),
    check("chk_wanted_entry_format", sql`${t.format} IS NULL OR ${t.format} IN ('vinyl', 'cd', 'cassette', 'other')`),
    check("chk_wanted_entry_note", sql`${t.note} IS NULL OR length(${t.note}) <= 140`),
  ],
);

export type WantedEntryRow = typeof wantedEntry.$inferSelect;

// Perfil enriquecido (cambio redesign-user-profile).
//
// - user_profile_link: enlaces externos, máx. 5 por usuario (validado en el
//   servicio; un CHECK no cuenta filas), con orden explícito.
// - user_pinned_item: cuatro destacados, tipos mezclados, patrón triple-FK
//   nullable + CHECK num_nonnulls igual que rating/favorite/user_list_item.
// - user_showcase: una fila por usuario, himno elegido manualmente (recording).
// - release_group_tag: tags de género por álbum para la cresta de géneros de
//   la huella; sembrados hasta que exista ingesta real desde MusicBrainz.
export const userProfileLink = pgTable(
  "user_profile_link",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_user_profile_link_user").on(t.userId, t.position),
    check(
      "chk_user_profile_link_kind",
      sql`${t.kind} IN ('bandcamp', 'lastfm', 'discogs', 'instagram', 'youtube', 'soundcloud', 'x', 'tiktok', 'spotify', 'other')`,
    ),
    check("chk_user_profile_link_url", sql`length(${t.url}) <= 400`),
  ],
);

export const userPinnedItem = pgTable(
  "user_pinned_item",
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
    note: text("note"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_user_pinned_item_user").on(t.userId, t.position),
    check("chk_user_pinned_item_note", sql`${t.note} IS NULL OR length(${t.note}) <= 120`),
    check(
      "chk_user_pinned_item_single_target",
      sql`num_nonnulls(${t.artistId}, ${t.releaseGroupId}, ${t.recordingId}) = 1`,
    ),
  ],
);

export const userShowcase = pgTable("user_showcase", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUser.id, { onDelete: "cascade" }),
  anthemRecordingId: uuid("anthem_recording_id").references(() => recording.id, {
    onDelete: "set null",
  }),
  // Artista/álbum "me define" (openspec: rework-user-profile, migración
  // 0030) — referencias directas, igual criterio que anthemRecordingId:
  // cualquier entidad válida del catálogo, sin requerir que además sea un
  // destacado o un favorito (antes vivía en user_pinned_item.is_defining,
  // lo que dejaba "Álbumes favoritos" sin forma de marcar un definitorio).
  definingArtistId: uuid("defining_artist_id").references(() => artist.id, {
    onDelete: "set null",
  }),
  definingReleaseGroupId: uuid("defining_release_group_id").references(() => releaseGroup.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const releaseGroupTag = pgTable(
  "release_group_tag",
  {
    releaseGroupId: uuid("release_group_id")
      .notNull()
      .references(() => releaseGroup.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    count: integer("count").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.releaseGroupId, t.tag] }),
    index("idx_release_group_tag_tag").on(t.tag),
    check("chk_release_group_tag_tag", sql`length(${t.tag}) <= 80`),
    check("chk_release_group_tag_count", sql`${t.count} >= 0`),
  ],
);

// Seguir artista — relación unilateral usuario → artista (migración 0021,
// cambio add-artist-following). Sin `status`: seguir es inmediato, un artista
// no aprueba solicitudes. Distinta de `favorite` con objetivo artista (gusto
// declarado) y de `user_follow` (usuario → usuario).
export const artistFollow = pgTable(
  "artist_follow",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artist.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_artist_follow_pair").on(t.userId, t.artistId),
    index("idx_artist_follow_artist").on(t.artistId),
  ],
);

export type UserProfileLinkRow = typeof userProfileLink.$inferSelect;
export type UserPinnedItemRow = typeof userPinnedItem.$inferSelect;
export type UserShowcaseRow = typeof userShowcase.$inferSelect;
export type ReleaseGroupTagRow = typeof releaseGroupTag.$inferSelect;
export type ArtistFollowRow = typeof artistFollow.$inferSelect;

// Valoraciones destacadas del perfil (openspec: rework-user-profile). Tabla
// de señal aparte — mismo motivo que user_list_pin/user_list_featured: no
// tocar rating.updated_at, para no disparar eventos de feed. Presencia de
// fila = destacada; una valoración destacada se vuelve visible para
// cualquier visitante con acceso al perfil, sin importar la relación de
// seguimiento (ver spec `rating-highlights`).
export const ratingHighlight = pgTable(
  "rating_highlight",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    ratingId: uuid("rating_id")
      .notNull()
      .references(() => rating.id, { onDelete: "cascade" }),
    highlightedAt: timestamp("highlighted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.ratingId] }),
    index("idx_rating_highlight_user_highlighted").on(t.userId, t.highlightedAt),
  ],
);

// Entradas de diario destacadas del perfil (openspec: rework-user-profile).
// Misma razón de tabla aparte que rating_highlight: no tocar
// listen_entry.updated_at. Una entrada destacada anula la matriz de
// visibilidad general del diario (ver spec `diary-visibility`).
export const listenEntryHighlight = pgTable(
  "listen_entry_highlight",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    listenEntryId: uuid("listen_entry_id")
      .notNull()
      .references(() => listenEntry.id, { onDelete: "cascade" }),
    highlightedAt: timestamp("highlighted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.listenEntryId] }),
    index("idx_listen_entry_highlight_user_highlighted").on(t.userId, t.highlightedAt),
  ],
);

export type RatingHighlightRow = typeof ratingHighlight.$inferSelect;
export type ListenEntryHighlightRow = typeof listenEntryHighlight.$inferSelect;

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
    moderationStatus: text("moderation_status").notNull().default("visible"),
    moderatedBy: uuid("moderated_by").references(() => appUser.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    moderationReason: text("moderation_reason"),
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
    check("chk_comment_moderation_status", sql`${t.moderationStatus} IN ('visible', 'hidden')`),
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

// Reseña como entidad propia (migración 0017, openspec: add-album-review).
// Misma forma de objetivo que rating/comment/favorite: 3 FK nullable +
// CHECK num_nonnulls = 1. `title` opcional (nullable; la app normaliza ''
// a NULL). El rating NO se guarda acá — vive en `rating` (LEFT JOIN en el
// listado). Una reseña vigente por (usuario, objetivo): índices únicos
// parciales por columna, definidos en la migración SQL cruda. Los CHECK de
// longitud de `title`/`body` también viven en la migración.
export const review = pgTable(
  "review",
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
    title: text("title"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    moderationStatus: text("moderation_status").notNull().default("visible"),
    moderatedBy: uuid("moderated_by").references(() => appUser.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    moderationReason: text("moderation_reason"),
  },
  (t) => [
    index("idx_review_artist").on(t.artistId),
    index("idx_review_release_group").on(t.releaseGroupId),
    index("idx_review_recording").on(t.recordingId),
    check(
      "chk_review_single_target",
      sql`num_nonnulls(${t.artistId}, ${t.releaseGroupId}, ${t.recordingId}) = 1`,
    ),
    check("chk_review_moderation_status", sql`${t.moderationStatus} IN ('visible', 'hidden')`),
  ],
);

export type ReviewRow = typeof review.$inferSelect;

// Imagen propia de la aplicación (migración 0044, openspec: add-image-storage).
// Cada fila es un archivo procesado (WebP, una resolución) que la app posee.
// `kind` se persiste para identificar qué filas reprocesar si un preset cambia;
// no hay asociación polimórfica — los dueños futuros tendrán FK propias
// (`*_image_id → image(id)` con `ON DELETE SET NULL`).
export const image = pgTable("image", {
  id: uuid("id").defaultRandom().primaryKey(),
  storageKey: text("storage_key").notNull().unique(),
  kind: text("kind").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  byteSize: integer("byte_size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ImageRow = typeof image.$inferSelect;
