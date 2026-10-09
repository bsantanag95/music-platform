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
  pgView,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * Temas de los comentarios de artista (add-artist-comment-topics). Catálogo cerrado: el
 * `CHECK chk_comment_topic_values` de la migración 0065 debe coincidir con esta lista.
 * `general` es el valor por defecto.
 */
export const COMMENT_TOPICS = ["start", "albums", "songs", "general"] as const;
export type CommentTopic = (typeof COMMENT_TOPICS)[number];
export const DEFAULT_COMMENT_TOPIC: CommentTopic = "general";

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
    // Búsqueda local tolerante (migración 0050, openspec redesign-scoped-search).
    index("idx_app_user_username_search").using(
      "gin",
      sql`search_normalize(${t.username}) gin_trgm_ops`,
    ),
    index("idx_app_user_display_name_search").using(
      "gin",
      sql`search_normalize(${t.displayName}) gin_trgm_ops`,
    ),
    // "Géneros que me mueven": la cifra de la página de género cuenta por contención (migración 0059).
    index("idx_app_user_genres").using("gin", t.genres),
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
    // Mantener la sesión en el dispositivo (migración 0058, change add-keep-signed-in).
    // Las mantenidas se renuevan con el uso; las demás caducan a las 24 h.
    remember: boolean("remember").notNull().default(true),
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
    // Nombre normalizado y guardado (migración 0067, ADR 0031): lo mantiene la base, nunca la app.
    // Sirve las sugerencias de 2 letras (inicio de palabra) sin recalcular `unaccent`.
    searchText: text("search_text").generatedAlwaysAs(sql`search_key(name)`),
    // Desambiguación de MusicBrainz ("Chilean alternative rock band"): distingue
    // homónimos en la búsqueda; no es una biografía (migración 0054 la renombró de `bio`).
    disambiguation: text("disambiguation"),
    // Miniatura (≤500 px) de la foto de Commons, con licencia libre verificada.
    photoUrl: text("photo_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    discographySyncedAt: timestamp("discography_synced_at", { withTimezone: true }),
    // NULL = la discografía nunca se recorrió entera (migración 0053, openspec:
    // fix-artist-discography-ingestion). Base de la resincronización cada 7 días.
    discographyCompleteAt: timestamp("discography_complete_at", { withTimezone: true }),
    // Resincronización (migración 0064, openspec: refresh-discography-on-new-releases):
    // total de MusicBrainz del último recorrido completo (base de la verificación barata),
    // última verificación (recorrido o atajo) y solicitud del calendario de lanzamientos.
    discographyMbTotal: integer("discography_mb_total"),
    discographyCheckedAt: timestamp("discography_checked_at", { withTimezone: true }),
    discographyRefreshRequestedAt: timestamp("discography_refresh_requested_at", { withTimezone: true }),
    membershipsSyncedAt: timestamp("memberships_synced_at", { withTimezone: true }),
    // NULL = la alineación nunca se guardó con períodos (migración 0055, openspec:
    // add-artist-lineup-data); se renueva con la ficha cada 30 días.
    lineupSyncedAt: timestamp("lineup_synced_at", { withTimezone: true }),
    // Ficha desde MusicBrainz (migración 0054, openspec: enrich-artist-profile). Fechas
    // con su precisión ('YYYY' | 'YYYY-MM' | 'YYYY-MM-DD'); en una persona son
    // nacimiento y muerte, en un grupo formación y separación.
    country: text("country"),
    beginAreaName: text("begin_area_name"),
    endAreaName: text("end_area_name"),
    lifeBegin: text("life_begin"),
    lifeEnd: text("life_end"),
    lifeEnded: boolean("life_ended"),
    // Entidad de Wikidata declarada por MusicBrainz (ADR 0021).
    wikidataId: text("wikidata_id"),
    profileSyncedAt: timestamp("profile_synced_at", { withTimezone: true }),
    wikimediaSyncedAt: timestamp("wikimedia_synced_at", { withTimezone: true }),
    // Crédito obligatorio de la foto de Commons y retiro a pedido.
    photoFile: text("photo_file"),
    photoAuthor: text("photo_author"),
    photoLicense: text("photo_license"),
    photoLicenseUrl: text("photo_license_url"),
    photoSourceUrl: text("photo_source_url"),
    photoBlockedAt: timestamp("photo_blocked_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_artist_name").on(t.name),
    // Búsqueda local tolerante (migración 0050, openspec redesign-scoped-search).
    index("idx_artist_name_search").using("gin", sql`search_normalize(${t.name}) gin_trgm_ops`),
    // Igualdad exacta por nombre normalizado (migración 0051).
    index("idx_artist_search_key").on(sql`search_key(${t.name})`),
    index("idx_artist_search_text_trgm").using("gin", sql`${t.searchText} gin_trgm_ops`),
    check("chk_artist_type", sql`${t.type} IN ('person','group','various','unknown')`),
    check("chk_artist_country", sql`${t.country} IS NULL OR ${t.country} ~ '^[A-Z]{2}$'`),
    check("chk_artist_life_begin", sql`${t.lifeBegin} IS NULL OR ${t.lifeBegin} ~ '^\\d{4}(-\\d{2}(-\\d{2})?)?$'`),
    check("chk_artist_life_end", sql`${t.lifeEnd} IS NULL OR ${t.lifeEnd} ~ '^\\d{4}(-\\d{2}(-\\d{2})?)?$'`),
    check("chk_artist_wikidata_id", sql`${t.wikidataId} IS NULL OR ${t.wikidataId} ~ '^Q[0-9]+$'`),
    check("chk_artist_discography_mb_total", sql`${t.discographyMbTotal} IS NULL OR ${t.discographyMbTotal} >= 0`),
    check(
      "chk_artist_photo_credit",
      sql`${t.photoFile} IS NULL OR (${t.photoUrl} IS NOT NULL AND ${t.photoLicense} IS NOT NULL AND ${t.photoSourceUrl} IS NOT NULL)`,
    ),
  ],
);

/** Enlaces curados del artista en orden fijo (migración 0054): sin redes sociales. */
export const artistLink = pgTable(
  "artist_link",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artist.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // 'official' | 'bandcamp' | 'streaming'
    url: text("url").notNull(),
    position: smallint("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_artist_link_kind", sql`${t.kind} IN ('official', 'bandcamp', 'streaming')`),
    unique("uq_artist_link_kind").on(t.artistId, t.kind),
  ],
);

/**
 * Textos del artista por idioma de la interfaz (migración 0054): descripción corta de
 * Wikidata, resumen de Wikipedia con su artículo (atribución CC BY-SA) y el lugar de
 * nacimiento o formación ya traducido.
 */
export const artistLocalizedText = pgTable(
  "artist_localized_text",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artist.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(), // 'es' | 'en'
    description: text("description"),
    summary: text("summary"),
    summaryTitle: text("summary_title"),
    summaryUrl: text("summary_url"),
    placeLabel: text("place_label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_artist_localized_text_locale", sql`${t.locale} IN ('es', 'en')`),
    check("chk_artist_localized_text_summary", sql`${t.summary} IS NULL OR ${t.summaryUrl} IS NOT NULL`),
    unique("uq_artist_localized_text").on(t.artistId, t.locale),
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

// Un período por relación `member of band` de MusicBrainz (migración 0055, openspec:
// add-artist-lineup-data). `membership.role`/`joinedOn`/`leftOn` son su resumen derivado.
export const membershipPeriod = pgTable(
  "membership_period",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => membership.id, { onDelete: "cascade" }),
    beginDate: text("begin_date"),
    endDate: text("end_date"),
    ended: boolean("ended").notNull().default(false),
    // Atributos crudos de MusicBrainz sin las marcas `original` y `additional`.
    instruments: text("instruments").array().notNull().default(sql`'{}'::text[]`),
    isFounder: boolean("is_founder").notNull().default(false),
    isAdditional: boolean("is_additional").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_membership_period_membership").on(t.membershipId),
    check("chk_membership_period_begin", sql`${t.beginDate} IS NULL OR ${t.beginDate} ~ '^\\d{4}(-\\d{2}(-\\d{2})?)?$'`),
    check("chk_membership_period_end", sql`${t.endDate} IS NULL OR ${t.endDate} ~ '^\\d{4}(-\\d{2}(-\\d{2})?)?$'`),
    check(
      "chk_membership_period_order",
      sql`${t.beginDate} IS NULL OR ${t.endDate} IS NULL OR left(${t.endDate}, 4) >= left(${t.beginDate}, 4)`,
    ),
  ],
);

// Músico de apoyo (instrumental, vocal o genérico) de cualquier artista, también de un
// solista (migración 0055). Nunca es integrante: no va en `membership`.
export const artistSupport = pgTable(
  "artist_support",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    musicianId: uuid("musician_id")
      .notNull()
      .references(() => artist.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artist.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // 'instrumental' | 'vocal' | 'general'
    instruments: text("instruments").array().notNull().default(sql`'{}'::text[]`),
    beginDate: text("begin_date"),
    endDate: text("end_date"),
    ended: boolean("ended").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_artist_support_musician").on(t.musicianId),
    index("idx_artist_support_artist").on(t.artistId),
    check("chk_artist_support_kind", sql`${t.kind} IN ('instrumental', 'vocal', 'general')`),
    check("chk_artist_support_not_self", sql`${t.musicianId} <> ${t.artistId}`),
    check("chk_artist_support_begin", sql`${t.beginDate} IS NULL OR ${t.beginDate} ~ '^\\d{4}(-\\d{2}(-\\d{2})?)?$'`),
    check("chk_artist_support_end", sql`${t.endDate} IS NULL OR ${t.endDate} ~ '^\\d{4}(-\\d{2}(-\\d{2})?)?$'`),
    check(
      "chk_artist_support_order",
      sql`${t.beginDate} IS NULL OR ${t.endDate} IS NULL OR left(${t.endDate}, 4) >= left(${t.beginDate}, 4)`,
    ),
  ],
);

export const releaseGroup = pgTable(
  "release_group",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mbid: uuid("mbid").unique(),
    title: text("title").notNull(),
    // Nombre normalizado y guardado (migración 0067, ADR 0031): lo mantiene la base, nunca la app.
    // Sirve las sugerencias de 2 letras (inicio de palabra) sin recalcular `unaccent`.
    searchText: text("search_text").generatedAlwaysAs(sql`search_key(title)`),
    category: text("category").notNull(), // 'studio' | 'single_ep' | 'compilation' | 'live_other'
    coverThumbUrl: text("cover_thumb_url"), // única fuente escribible de la carátula
    // Espejo propio de la carátula (migración 0047, openspec: mirror-cover-art).
    // `coverStorageKey` es la fuente de verdad del objeto espejado;
    // `coverThumbUrl` queda como URL servible denormalizada (espejo o CAA).
    coverStorageKey: text("cover_storage_key").unique(),
    // Última verificación concluyente contra CAA (encontrada o 404), para
    // acotar el reintento de negativos. No es "resuelta": ver `coverResolved`.
    coverCheckedAt: timestamp("cover_checked_at", { withTimezone: true }),
    // Retiro a pedido: bloquea resolución, espejo y hotlink.
    coverBlockedAt: timestamp("cover_blocked_at", { withTimezone: true }),
    // Fecha de lanzamiento canónica del release-group (migración 0016):
    // derivada de `first-release-date` de MusicBrainz sobre TODAS las
    // ediciones, no de la edición ingerida. `firstReleaseDate` solo se
    // puebla con precisión diaria; `firstReleaseYear` con cualquier año
    // conocido (misma tolerancia que release-date-precision).
    firstReleaseDate: date("first_release_date"),
    firstReleaseYear: smallint("first_release_year"),
    // NULL = resumen de ediciones pendiente de sincronizar (migración 0048).
    editionsSyncedAt: timestamp("editions_synced_at", { withTimezone: true }),
    // Discografía (migración 0053): fuera de la discografía (solo bootleg o ya no
    // devuelto por MusicBrainz) y tipos crudos de MusicBrainz (NULL = sin sincronizar).
    discographyUnlistedAt: timestamp("discography_unlisted_at", { withTimezone: true }),
    primaryType: text("primary_type"),
    secondaryTypes: text("secondary_types").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Entidad de Wikidata que MusicBrainz declara para el álbum (migración 0056, ADR 0023)
    // y vigencia de sus géneros semilla (NULL = nunca sincronizados; 30 días).
    wikidataId: text("wikidata_id"),
    genresSyncedAt: timestamp("genres_synced_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_release_group_first_year").on(t.firstReleaseYear),
    check("chk_release_group_wikidata_id", sql`${t.wikidataId} IS NULL OR ${t.wikidataId} ~ '^Q[0-9]+$'`),
    // Búsqueda local tolerante (migración 0050, openspec redesign-scoped-search).
    index("idx_release_group_title_search").using(
      "gin",
      sql`search_normalize(${t.title}) gin_trgm_ops`,
    ),
    index("idx_release_group_search_text_trgm").using("gin", sql`${t.searchText} gin_trgm_ops`),
  ],
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
    // Edición cuya tracklist es "la del álbum". A lo sumo una por release-group:
    // índice único parcial `uq_release_representative` en la migración 0048.
    isRepresentative: boolean("is_representative").notNull().default(false),
    // NULL = créditos de personal pendientes (distinto de `creditsSyncedAt`,
    // que cubre los créditos de autoría `primary` / `featured`).
    personnelSyncedAt: timestamp("personnel_synced_at", { withTimezone: true }),
    // NULL = autoría de obras pendiente (migración 0049, openspec: add-songwriter-credits).
    worksSyncedAt: timestamp("works_synced_at", { withTimezone: true }),
  },
  (t) => [index("idx_release_release_group").on(t.releaseGroupId)],
);

/** Resumen de cada edición que MusicBrainz reporta para un release-group (migración 0048). */
export const releaseEdition = pgTable(
  "release_edition",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mbid: uuid("mbid").notNull().unique(),
    releaseGroupId: uuid("release_group_id")
      .notNull()
      .references(() => releaseGroup.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    disambiguation: text("disambiguation"),
    status: text("status"), // 'Official' | 'Promotion' | 'Bootleg' | 'Pseudo-Release' | null
    releaseDate: date("release_date"),
    releaseYear: smallint("release_year"),
    country: text("country"),
    packaging: text("packaging"),
    formats: text("formats").array().notNull().default(sql`'{}'::text[]`),
    mediumCount: smallint("medium_count").notNull().default(0),
    trackCount: smallint("track_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_release_edition_release_group").on(t.releaseGroupId)],
);

export const label = pgTable("label", {
  id: uuid("id").defaultRandom().primaryKey(),
  mbid: uuid("mbid").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Sello y número de catálogo de una edición, en el orden de MusicBrainz. */
export const releaseEditionLabel = pgTable(
  "release_edition_label",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseEditionId: uuid("release_edition_id")
      .notNull()
      .references(() => releaseEdition.id, { onDelete: "cascade" }),
    labelId: uuid("label_id").references(() => label.id, { onDelete: "cascade" }),
    catalogNumber: text("catalog_number"),
    position: smallint("position").notNull(),
  },
  (t) => [
    unique("release_edition_label_release_edition_id_position_key").on(t.releaseEditionId, t.position),
    index("idx_release_edition_label_label").on(t.labelId),
    check("chk_release_edition_label_value", sql`num_nonnulls(${t.labelId}, ${t.catalogNumber}) >= 1`),
  ],
);

export const recording = pgTable(
  "recording",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mbid: uuid("mbid").unique(),
    title: text("title").notNull(),
    // Nombre normalizado y guardado (migración 0067, ADR 0031): lo mantiene la base, nunca la app.
    // Sirve las sugerencias de 2 letras (inicio de palabra) sin recalcular `unaccent`.
    searchText: text("search_text").generatedAlwaysAs(sql`search_key(title)`),
    durationSec: integer("duration_sec"),
    // Las variantes (`variant_type`, `variant_of_id`) se retiraron en 0052: qué versión es
    // una grabación lo dicen los atributos de `recording_work` (openspec: redesign-song-page).
  },
  (t) => [
    index("idx_recording_title").on(t.title),
    // Búsqueda local tolerante (migración 0050, openspec redesign-scoped-search).
    index("idx_recording_title_search").using("gin", sql`search_normalize(${t.title}) gin_trgm_ops`),
    index("idx_recording_search_text_trgm").using("gin", sql`${t.searchText} gin_trgm_ops`),
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

/**
 * Crédito de personal (relación de artista de MusicBrainz) sobre una edición o una
 * grabación (migración 0048). Separado de `credit`, que modela la autoría visible.
 */
export const personnelCredit = pgTable(
  "personnel_credit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artist.id, { onDelete: "cascade" }),
    releaseId: uuid("release_id").references(() => release.id, { onDelete: "cascade" }),
    recordingId: uuid("recording_id").references(() => recording.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(),
    attributes: text("attributes").array().notNull().default(sql`'{}'::text[]`),
    creditedAs: text("credited_as"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_personnel_credit_artist").on(t.artistId),
    check(
      "chk_personnel_credit_single_target",
      sql`num_nonnulls(${t.releaseId}, ${t.recordingId}) = 1`,
    ),
    // uq_personnel_credit_release / uq_personnel_credit_recording: índices únicos
    // parciales definidos en la migración SQL.
  ],
);

// Obras de MusicBrainz y su autoría (migración 0049, openspec: add-songwriter-credits).
// La autoría cuelga de la obra, que comparten estudio, vivo y covers.
export const work = pgTable("work", {
  id: uuid("id").defaultRandom().primaryKey(),
  mbid: uuid("mbid").notNull().unique(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recordingWork = pgTable(
  "recording_work",
  {
    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recording.id, { onDelete: "cascade" }),
    workId: uuid("work_id")
      .notNull()
      .references(() => work.id, { onDelete: "cascade" }),
    /** Atributos del vínculo (`cover`, `live`, `instrumental`, …), ordenados. */
    attributes: text("attributes").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [primaryKey({ columns: [t.recordingId, t.workId] }), index("idx_recording_work_work").on(t.workId)],
);

export const workCredit = pgTable(
  "work_credit",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workId: uuid("work_id")
      .notNull()
      .references(() => work.id, { onDelete: "cascade" }),
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artist.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull(),
    attributes: text("attributes").array().notNull().default(sql`'{}'::text[]`),
    creditedAs: text("credited_as"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("work_credit_work_id_artist_id_relation_type_attributes_key").on(
      t.workId,
      t.artistId,
      t.relationType,
      t.attributes,
    ),
    index("idx_work_credit_artist").on(t.artistId),
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
export type ArtistLinkRow = typeof artistLink.$inferSelect;
export type ArtistLocalizedTextRow = typeof artistLocalizedText.$inferSelect;
export type MembershipPeriodRow = typeof membershipPeriod.$inferSelect;
export type ArtistSupportRow = typeof artistSupport.$inferSelect;
export type ReleaseEditionRow = typeof releaseEdition.$inferSelect;
export type LabelRow = typeof label.$inferSelect;
export type PersonnelCreditRow = typeof personnelCredit.$inferSelect;
export type WorkRow = typeof work.$inferSelect;
export type RecordingWorkRow = typeof recordingWork.$inferSelect;
export type WorkCreditRow = typeof workCredit.$inferSelect;
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
      .default(sql`'{}'::text[]`),
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
// collectionEntry, format es nullable ("cualquier formato"). Sin vista
// pública por `username`; desde la migración 0061 (expand-feed-coverage) cada
// entrada tiene audiencia, que solo decide si aparece en el feed de seguidos
// (las anteriores quedaron `private`). Varias entradas por álbum permitidas,
// sin índice único.
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
      .default(sql`'{}'::text[]`),
    note: text("note"),
    audience: text("audience").notNull().default("followers"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_wanted_entry_user_created").on(t.userId, t.createdAt),
    index("idx_wanted_entry_user_release_group").on(t.userId, t.releaseGroupId),
    index("idx_wanted_entry_release_group").on(t.releaseGroupId),
    check("chk_wanted_entry_format", sql`${t.format} IS NULL OR ${t.format} IN ('vinyl', 'cd', 'cassette', 'other')`),
    check("chk_wanted_entry_note", sql`${t.note} IS NULL OR length(${t.note}) <= 140`),
    check("chk_wanted_entry_audience", sql`${t.audience} IN ('private', 'followers', 'public')`),
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
// (La tabla de tags sembrados `release_group_tag` se eliminó en la migración 0056: los géneros
// salen de la taxonomía y de las semillas de Wikidata, ver `genre` más abajo.)
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

// Taxonomía de géneros (migración 0056, openspec: add-genre-taxonomy, ADR 0023): la lista
// oficial de MusicBrainz (dump core, CC0), cargada por scripts/load-genre-taxonomy.ts desde
// data/genres/taxonomy.json. `slug` es la clave estable (URL, API e identidad musical), única y
// en inglés; `nameEs` es la etiqueta de Wikidata (P8052), sin traducción automática.
export const GENRE_KINDS = ["style", "descriptor", "hidden"] as const;
export type GenreKind = (typeof GENRE_KINDS)[number];

export const genre = pgTable(
  "genre",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mbid: uuid("mbid").notNull().unique(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nameEs: text("name_es"),
    wikidataId: text("wikidata_id"),
    kind: text("kind").$type<GenreKind>().notNull().default("style"),
    // Última sincronización del texto "Sobre el género" con Wikimedia (migración 0059, ADR 0027).
    wikimediaSyncedAt: timestamp("wikimedia_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_genre_wikidata_id").on(t.wikidataId).where(sql`${t.wikidataId} IS NOT NULL`),
    check("chk_genre_slug", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check("chk_genre_name", sql`length(btrim(${t.name})) > 0`),
    check("chk_genre_name_es", sql`${t.nameEs} IS NULL OR length(btrim(${t.nameEs})) > 0`),
    check("chk_genre_wikidata_id", sql`${t.wikidataId} IS NULL OR ${t.wikidataId} ~ '^Q[0-9]+$'`),
    check("chk_genre_kind", sql`${t.kind} IN ('style','descriptor','hidden')`),
  ],
);

// Texto "Sobre el género" por idioma (migración 0059, openspec: redesign-genre-page, ADR 0027): la
// descripción corta de Wikidata y la introducción del artículo de Wikipedia (CC BY-SA 4.0) con su
// título y su URL canónica, que la atribución exige. Misma forma que `artist_localized_text`.
export const genreLocalizedText = pgTable(
  "genre_localized_text",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genre.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(), // 'es' | 'en'
    description: text("description"),
    summary: text("summary"),
    summaryTitle: text("summary_title"),
    summaryUrl: text("summary_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_genre_localized_text_locale", sql`${t.locale} IN ('es', 'en')`),
    check("chk_genre_localized_text_summary", sql`${t.summary} IS NULL OR ${t.summaryUrl} IS NOT NULL`),
    unique("uq_genre_localized_text").on(t.genreId, t.locale),
  ],
);

export const GENRE_RELATION_KINDS = ["subgenre_of", "fusion_of", "influenced_by"] as const;
export type GenreRelationKind = (typeof GENRE_RELATION_KINDS)[number];

/** "`genreId` es subgénero de / fusión de / influido por `relatedGenreId`". */
export const genreRelation = pgTable(
  "genre_relation",
  {
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genre.id, { onDelete: "cascade" }),
    relatedGenreId: uuid("related_genre_id")
      .notNull()
      .references(() => genre.id, { onDelete: "cascade" }),
    kind: text("kind").$type<GenreRelationKind>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.genreId, t.relatedGenreId, t.kind] }),
    index("idx_genre_relation_related").on(t.relatedGenreId, t.kind),
    check("chk_genre_relation_kind", sql`${t.kind} IN ('subgenre_of','fusion_of','influenced_by')`),
    check("chk_genre_relation_not_self", sql`${t.genreId} <> ${t.relatedGenreId}`),
  ],
);

/** Las 20 familias curadas, insertadas por la migración 0056; sus nombres viven en `messages/*`. */
export const genreFamily = pgTable(
  "genre_family",
  {
    key: text("key").primaryKey(),
    tier: text("tier").$type<"main" | "more">().notNull(),
    position: smallint("position").notNull().unique(),
  },
  (t) => [
    check("chk_genre_family_key", sql`${t.key} ~ '^[a-z]+(-[a-z]+)*$'`),
    check("chk_genre_family_tier", sql`${t.tier} IN ('main','more')`),
    check("chk_genre_family_position", sql`${t.position} > 0`),
  ],
);

export const genreFamilyMember = pgTable(
  "genre_family_member",
  {
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genre.id, { onDelete: "cascade" }),
    familyKey: text("family_key")
      .notNull()
      .references(() => genreFamily.key, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ columns: [t.genreId, t.familyKey] }),
    index("idx_genre_family_member_family").on(t.familyKey),
  ],
);

// Géneros semilla desde Wikidata P136 (CC0), en el orden de Wikidata. Separados de los votos de
// la comunidad; se reemplazan completos en cada sincronización. Un género retirado queda
// `hidden` en vez de borrarse, por eso el FK a `genre` es RESTRICT.
export const artistGenreSeed = pgTable(
  "artist_genre_seed",
  {
    artistId: uuid("artist_id")
      .notNull()
      .references(() => artist.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genre.id, { onDelete: "restrict" }),
    position: smallint("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.artistId, t.genreId] }),
    index("idx_artist_genre_seed_genre").on(t.genreId),
    check("chk_artist_genre_seed_position", sql`${t.position} >= 0`),
  ],
);

// Herencia de géneros materializada (migración 0060, openspec: add-genre-artist-discovery, ADR 0028): los 3
// primeros géneros de estilo del primer artista principal de cada álbum. La mantienen triggers sobre `credit`,
// `artist_genre_seed` y `genre.kind`; la vista `release_group_effective_genre` la lee y aplica en lectura
// `kind = 'style'` y la ausencia de puntaje positivo. Nunca se escribe desde la aplicación.
export const releaseGroupInheritedGenre = pgTable(
  "release_group_inherited_genre",
  {
    releaseGroupId: uuid("release_group_id")
      .notNull()
      .references(() => releaseGroup.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genre.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.releaseGroupId, t.genreId] }),
    index("idx_release_group_inherited_genre_genre").on(t.genreId),
    check("chk_release_group_inherited_genre_position", sql`${t.position} >= 0`),
  ],
);

export const releaseGroupGenreSeed = pgTable(
  "release_group_genre_seed",
  {
    releaseGroupId: uuid("release_group_id")
      .notNull()
      .references(() => releaseGroup.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genre.id, { onDelete: "restrict" }),
    position: smallint("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.releaseGroupId, t.genreId] }),
    index("idx_release_group_genre_seed_genre").on(t.genreId),
    check("chk_release_group_genre_seed_position", sql`${t.position} >= 0`),
  ],
);

// Votos de la comunidad sobre los géneros de un álbum (migración 0057, openspec:
// add-genre-votes). Un voto por persona, álbum y género; votar un género que el álbum no tiene lo
// propone. El tope de 8, el tipo de género y la interacción con el álbum los valida el servicio.
export const releaseGroupGenreVote = pgTable(
  "release_group_genre_vote",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    releaseGroupId: uuid("release_group_id")
      .notNull()
      .references(() => releaseGroup.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id")
      .notNull()
      .references(() => genre.id, { onDelete: "restrict" }),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_release_group_genre_vote").on(t.userId, t.releaseGroupId, t.genreId),
    index("idx_release_group_genre_vote_album").on(t.releaseGroupId, t.genreId),
    check("chk_release_group_genre_vote_value", sql`${t.value} IN (-1, 1)`),
  ],
);

/**
 * Puntaje de un género en un álbum (vista de la migración 0057): la semilla propia vale 1 y se
 * suman los votos de cuentas no desactivadas. `seedPosition` es NULL si no hay semilla.
 */
export const releaseGroupGenreScore = pgView("release_group_genre_score", {
  releaseGroupId: uuid("release_group_id").notNull(),
  genreId: uuid("genre_id").notNull(),
  seed: integer("seed").notNull(),
  up: integer("up").notNull(),
  down: integer("down").notNull(),
  score: integer("score").notNull(),
  seedPosition: smallint("seed_position"),
}).existing();

/**
 * Géneros efectivos de un álbum (vista de la migración 0057): los géneros con puntaje mayor que 0
 * ordenados por puntaje (`position` 1 = principal); si no hay ninguno, los 3 primeros géneros de
 * estilo de su artista principal, con `inherited` y `score` 0. Nunca incluye ocultos.
 */
export const releaseGroupEffectiveGenre = pgView("release_group_effective_genre", {
  releaseGroupId: uuid("release_group_id").notNull(),
  genreId: uuid("genre_id").notNull(),
  position: smallint("position").notNull(),
  inherited: boolean("inherited").notNull(),
  score: integer("score").notNull(),
}).existing();

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
export type GenreRow = typeof genre.$inferSelect;
export type ReleaseGroupInheritedGenreRow = typeof releaseGroupInheritedGenre.$inferSelect;
export type GenreLocalizedTextRow = typeof genreLocalizedText.$inferSelect;
export type GenreRelationRow = typeof genreRelation.$inferSelect;
export type GenreFamilyRow = typeof genreFamily.$inferSelect;
export type ArtistGenreSeedRow = typeof artistGenreSeed.$inferSelect;
export type ReleaseGroupGenreSeedRow = typeof releaseGroupGenreSeed.$inferSelect;
export type ReleaseGroupGenreVoteRow = typeof releaseGroupGenreVote.$inferSelect;
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
    // Tema del comentario de artista (add-artist-comment-topics); NULL en álbum y canción.
    topic: text("topic").$type<CommentTopic>(),
    // Respuesta de un nivel (add-comment-replies): apunta a la RAÍZ (parent_id NULL). La respuesta
    // copia el objetivo de su raíz y hereda su tema (topic NULL). Cascada: borrar la raíz borra el hilo.
    parentId: uuid("parent_id").references((): AnyPgColumn => comment.id, { onDelete: "cascade" }),
    moderationStatus: text("moderation_status").notNull().default("visible"),
    moderatedBy: uuid("moderated_by").references(() => appUser.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    moderationReason: text("moderation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_comment_artist_topic")
      .on(t.artistId, t.topic, t.createdAt.desc())
      .where(sql`${t.artistId} IS NOT NULL`),
    check(
      "chk_comment_topic_values",
      sql`${t.topic} IS NULL OR ${t.topic} IN ('start', 'albums', 'songs', 'general')`,
    ),
    check("chk_comment_topic_artist_only", sql`${t.topic} IS NULL OR ${t.artistId} IS NOT NULL`),
    check(
      "chk_comment_artist_topic_required",
      sql`${t.artistId} IS NULL OR ${t.topic} IS NOT NULL OR ${t.parentId} IS NOT NULL`,
    ),
    check("chk_comment_reply_no_topic", sql`${t.parentId} IS NULL OR ${t.topic} IS NULL`),
    index("idx_comment_parent")
      .on(t.parentId, t.createdAt)
      .where(sql`${t.parentId} IS NOT NULL`),
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

// Likes en comentarios (openspec: add-comment-likes, migración 0062). Registro anónimo:
// solo deduplica y cuenta; nunca se expone quién likeó.
export const commentLike = pgTable(
  "comment_like",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comment.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.commentId, t.userId] }),
    index("idx_comment_like_user").on(t.userId),
  ],
);

export type CommentLikeRow = typeof commentLike.$inferSelect;

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

// Calendario de lanzamientos de Inicio (migración 0063, openspec: add-home-release-calendar, ADR 0029).
// Índice del feed "Fresh Releases" de ListenBrainz, separado del catálogo: una fila no es un
// release-group. Solo lo que se muestra se vincula (`releaseGroupId`, SET NULL). La ventana se
// reemplaza completa en cada sincronización; `verifiedAt`/`firstReleaseDate`/`exclusion` salen de la
// verificación en MusicBrainz y `anonymousRank` del orden de la selección anónima.
export const releaseCalendarEntry = pgTable(
  "release_calendar_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    releaseGroupMbid: uuid("release_group_mbid").notNull().unique(),
    releaseMbid: uuid("release_mbid"),
    title: text("title").notNull(),
    artistCreditName: text("artist_credit_name").notNull(),
    artistMbids: uuid("artist_mbids").array().notNull().default(sql`'{}'`),
    releaseDate: date("release_date").notNull(),
    primaryType: text("primary_type").$type<"Album" | "EP">().notNull(),
    hasCover: boolean("has_cover").notNull(),
    artistListeners: integer("artist_listeners"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    firstReleaseDate: date("first_release_date"),
    exclusion: text("exclusion").$type<"secondary_type" | "reissue">(),
    releaseGroupId: uuid("release_group_id").references(() => releaseGroup.id, { onDelete: "set null" }),
    anonymousRank: smallint("anonymous_rank"),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_release_calendar_entry_date").on(t.releaseDate),
    index("idx_release_calendar_entry_artists").using("gin", t.artistMbids),
    index("idx_release_calendar_entry_rank").on(t.anonymousRank).where(sql`${t.anonymousRank} IS NOT NULL`),
    check("chk_release_calendar_entry_primary_type", sql`${t.primaryType} IN ('Album', 'EP')`),
    check("chk_release_calendar_entry_exclusion", sql`${t.exclusion} IN ('secondary_type', 'reissue')`),
    check(
      "chk_release_calendar_entry_listeners",
      sql`${t.artistListeners} IS NULL OR ${t.artistListeners} >= 0`,
    ),
    check("chk_release_calendar_entry_rank", sql`${t.anonymousRank} IS NULL OR ${t.anonymousRank} > 0`),
    check(
      "chk_release_calendar_entry_verified",
      sql`${t.exclusion} IS NULL OR ${t.verifiedAt} IS NOT NULL`,
    ),
  ],
);

export type ReleaseCalendarEntryRow = typeof releaseCalendarEntry.$inferSelect;

export const releaseCalendarSync = pgTable(
  "release_calendar_sync",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    status: text("status").$type<"running" | "succeeded" | "failed">().notNull().default("running"),
    entryCount: integer("entry_count"),
    error: text("error"),
  },
  (t) => [
    index("idx_release_calendar_sync_finished")
      .on(t.finishedAt.desc())
      .where(sql`${t.status} = 'succeeded'`),
    check("chk_release_calendar_sync_status", sql`${t.status} IN ('running', 'succeeded', 'failed')`),
  ],
);

export type ReleaseCalendarSyncRow = typeof releaseCalendarSync.$inferSelect;
