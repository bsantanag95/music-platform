import { and, desc, eq, inArray, isNull, lt, notExists, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  appUser,
  artist,
  comment,
  moderationAction,
  notification,
  releaseGroup,
  userBlock,
  userList,
} from "@/db/schema";
import type { NotificationKind, NotificationTab } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { DEFAULT_TIME_ZONE, parseTimeZone } from "@/lib/time-zone";
import { resolveImageUrls } from "@/services/storage/avatar-urls";

// Lectura de la bandeja (openspec: add-notifications-core, D4, D5 y D6).
//
// Todo lo que se lee pasa por `visibleNotifications`: los filtros de privacidad
// se aplican al leer y no al emitir, así restaurar un contenido o desbloquear
// deja la bandeja coherente sin reescribir filas (D4). La agrupación y el
// contador se calculan sobre esa misma fuente para que no puedan discrepar.

const PAGE_SIZE = 20;

/** Acción de moderación tal como la guarda `moderation_action.action`. */
export const MODERATION_ACTIONS = [
  "hide",
  "restore",
  "suspend_social",
  "revoke_social",
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

/** Objeto al que se refiere una acción de moderación. */
export type ModerationContentType = "comment" | "review" | "list" | "social_suspension";

/** Persona que aparece en la entrada (máximo dos por grupo en la interfaz). */
export interface NotificationActor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * Destino de la entrada. La interfaz no compone textos a partir de ids sueltos:
 * cada grupo trae lo que necesita para enlazar y para redactar.
 */
export type NotificationTarget =
  | { type: "artist"; artistId: string; artistName: string; rootId: string }
  | { type: "profile"; username: string }
  | {
      type: "moderation";
      action: ModerationAction;
      contentType: ModerationContentType;
      reason: string;
    }
  | {
      type: "comment";
      artistId: string;
      artistName: string;
      rootId: string;
      /** Hito más alto del grupo. */
      milestone: number;
    }
  | {
      type: "list";
      listId: string;
      title: string;
      /** Un Camino enlaza a su ruta propia, no a la de listas. */
      isCamino: boolean;
      /** Hito más alto del grupo. */
      milestone: number;
    }
  | {
      type: "release";
      releaseGroupId: string;
      title: string;
      artistName: string;
      category: "album" | "ep" | "single";
      /** Fecha exacta conocida o `null` si el disco solo tiene año. */
      releaseDate: string | null;
      /** Miniatura de 250 px o `null` (placeholder en la interfaz). */
      coverUrl: string | null;
    };

export interface NotificationGroup {
  /** Clave estable de la entrada; es lo que recibe `markRead`. */
  id: string;
  kind: NotificationKind;
  /** Fecha ISO 8601 del evento más reciente del grupo (texto, ya serializable). */
  lastAt: string;
  unread: boolean;
  /** Eventos del grupo (respuestas, seguidores…). */
  eventCount: number;
  /** Personas distintas del grupo; el resto tras los dos nombres es `actorCount - actors.length`. */
  actorCount: number;
  actors: NotificationActor[];
  target: NotificationTarget | null;
}

export interface NotificationPage {
  groups: NotificationGroup[];
  nextCursor: string | null;
}

// ---------------------------------------------------------------------------
// Filtros de privacidad (D4) y pestañas (D7)
// ---------------------------------------------------------------------------

/** Tipos de cada pestaña: "Para ti" (Fase 1 + hitos) y "Novedades" (lanzamientos). */
export const TAB_KINDS: Record<NotificationTab, readonly NotificationKind[]> = {
  for_you: [
    "comment_reply",
    "thread_reply",
    "new_follower",
    "follow_request",
    "follow_accepted",
    "moderation",
    "comment_like_milestone",
    "list_save_milestone",
  ],
  releases: ["artist_release", "artist_release_announced", "artist_single"],
};

/**
 * Bloqueo en cualquier dirección entre el destinatario y el actor del aviso.
 * Se expresa como subconsulta para no unir `user_block` a la fila.
 */
function blockedBetween(recipientId: string) {
  return notExists(
    db
      .select({ one: sql`1` })
      .from(userBlock)
      .where(
        or(
          and(eq(userBlock.blockerId, recipientId), eq(userBlock.blockedId, notification.actorId)),
          and(eq(userBlock.blockerId, notification.actorId), eq(userBlock.blockedId, recipientId)),
        ),
      ),
  );
}

/**
 * Filas de `notification` que el destinatario puede ver en la pestaña. Excluye
 * actores desactivados, bloqueos en cualquier dirección, respuestas ocultas (o
 * con la raíz oculta), listas ocultas por moderación y discos retirados de la
 * discografía. `moderation` queda exenta: es justamente el asunto del aviso.
 */
function visibleNotifications(recipientId: string, tab: NotificationTab) {
  const actor = alias(appUser, "notification_actor");
  const reply = alias(comment, "notification_reply");
  const root = alias(comment, "notification_root");

  // La notificación apunta a la respuesta; la raíz del hilo es su `parent_id`.
  // En un comentario raíz no hay `parent_id`: el propio comentario es el hilo.
  const replyVisible = or(
    isNull(notification.commentId),
    and(
      eq(reply.moderationStatus, "visible"),
      or(isNull(reply.parentId), eq(root.moderationStatus, "visible")),
    ),
  );

  const listVisible = or(
    isNull(notification.listId),
    eq(userList.moderationStatus, "visible"),
  );

  // `cover_blocked_at` no oculta el aviso: solo la carátula (la interfaz usa el
  // placeholder). `discography_unlisted_at` sí: el disco ya no es de la persona.
  const releaseVisible = or(
    isNull(notification.releaseGroupId),
    isNull(releaseGroup.discographyUnlistedAt),
  );

  return db
    .select({
      groupKey: notification.groupKey,
      kind: notification.kind,
      actorId: notification.actorId,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
      actorUsername: actor.username,
      actorDisplayName: actor.displayName,
      actorAvatarImageId: actor.avatarImageId,
      // Las columnas de tablas unidas llevan alias explícito: la subconsulta se
      // referencia después por nombre y, sin alias, `user_list.kind`,
      // `user_list.id` o `release_group.title` chocarían con los de otra tabla.
      artistId: sql<string | null>`${artist.id}`.as("artist_id"),
      artistName: sql<string | null>`${artist.name}`.as("artist_name"),
      rootId: sql<string | null>`coalesce(${reply.parentId}, ${reply.id})`.as("root_id"),
      moderationAction: moderationAction.action,
      moderationReason: moderationAction.reason,
      moderationContentType: sql<ModerationContentType | null>`case
        when ${moderationAction.commentId} is not null then 'comment'
        when ${moderationAction.reviewId} is not null then 'review'
        when ${moderationAction.listId} is not null then 'list'
        when ${moderationAction.restrictionId} is not null then 'social_suspension'
        else null end`.as("moderation_content_type"),
      milestone: notification.milestone,
      listId: sql<string | null>`${userList.id}`.as("list_id"),
      listTitle: sql<string | null>`${userList.title}`.as("list_title"),
      listKind: sql<string | null>`${userList.kind}`.as("list_kind"),
      releaseGroupId: sql<string | null>`${releaseGroup.id}`.as("release_group_id"),
      releaseTitle: sql<string | null>`${releaseGroup.title}`.as("release_title"),
      releaseArtistName: sql<string | null>`(
        select a2.name
        from credit c2
        join artist a2 on a2.id = c2.artist_id
        where c2.release_group_id = ${releaseGroup.id} and c2.role = 'primary'
        order by c2.position
        limit 1
      )`.as("release_artist_name"),
      releaseCategory: releaseGroup.category,
      releasePrimaryType: releaseGroup.primaryType,
      releaseDate: sql<string | null>`${releaseGroup.firstReleaseDate}::text`.as("release_date"),
      releaseCoverUrl: sql<string | null>`case
        when ${releaseGroup.coverBlockedAt} is not null then null
        else ${releaseGroup.coverThumbUrl}
      end`.as("release_cover_url"),
    })
    .from(notification)
    .leftJoin(actor, eq(actor.id, notification.actorId))
    .leftJoin(reply, eq(reply.id, notification.commentId))
    .leftJoin(root, eq(root.id, reply.parentId))
    .leftJoin(artist, eq(artist.id, reply.artistId))
    .leftJoin(moderationAction, eq(moderationAction.id, notification.moderationActionId))
    .leftJoin(userList, eq(userList.id, notification.listId))
    .leftJoin(releaseGroup, eq(releaseGroup.id, notification.releaseGroupId))
    .where(
      and(
        eq(notification.recipientId, recipientId),
        inArray(notification.kind, [...TAB_KINDS[tab]]),
        or(
          eq(notification.kind, "moderation"),
          and(
            or(isNull(notification.actorId), isNull(actor.deactivatedAt)),
            blockedBetween(recipientId),
            replyVisible,
            listVisible,
            releaseVisible,
          ),
        ),
      ),
    )
    .as("visible_notification");
}

type GroupKeySource = { groupKey: SQLWrapper; createdAt: SQLWrapper };

/**
 * Filas mínimas para el contador de "Para ti": solo la clave, la fecha y el
 * estado de lectura, con los mismos filtros de privacidad. Evita planificar los
 * joins de artista, moderación y disco que el contador no necesita.
 */
function visibleForYouKeys(recipientId: string) {
  const actor = alias(appUser, "notification_actor");
  const reply = alias(comment, "notification_reply");
  const root = alias(comment, "notification_root");

  return db
    .select({
      groupKey: notification.groupKey,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    })
    .from(notification)
    .leftJoin(actor, eq(actor.id, notification.actorId))
    .leftJoin(reply, eq(reply.id, notification.commentId))
    .leftJoin(root, eq(root.id, reply.parentId))
    .leftJoin(userList, eq(userList.id, notification.listId))
    .where(
      and(
        eq(notification.recipientId, recipientId),
        inArray(notification.kind, [...TAB_KINDS.for_you]),
        or(
          eq(notification.kind, "moderation"),
          and(
            or(isNull(notification.actorId), isNull(actor.deactivatedAt)),
            blockedBetween(recipientId),
            or(
              isNull(notification.commentId),
              and(
                eq(reply.moderationStatus, "visible"),
                or(isNull(reply.parentId), eq(root.moderationStatus, "visible")),
              ),
            ),
            or(isNull(notification.listId), eq(userList.moderationStatus, "visible")),
          ),
        ),
      ),
    )
    .as("for_you_notification");
}

/**
 * Filas mínimas para el punto de "Novedades". Los tres tipos de lanzamiento
 * tienen actor, comentario y lista nulos por `CHECK`, así que solo importa el
 * disco (retirado de la discografía) y la pestaña.
 */
function visibleReleaseKeys(recipientId: string) {
  return db
    .select({
      groupKey: notification.groupKey,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    })
    .from(notification)
    .leftJoin(releaseGroup, eq(releaseGroup.id, notification.releaseGroupId))
    .where(
      and(
        eq(notification.recipientId, recipientId),
        inArray(notification.kind, [...TAB_KINDS.releases]),
        or(
          isNull(notification.releaseGroupId),
          isNull(releaseGroup.discographyUnlistedAt),
        ),
      ),
    )
    .as("release_notification");
}

// ---------------------------------------------------------------------------
// Agrupación (D5)
// ---------------------------------------------------------------------------

/**
 * Clave de la entrada: el `group_key` de la fila, con `followers` partido por
 * día local. El resto (`thread:<root>`, `follow:<id>`, `moderation:<id>`) no se
 * agrupa más allá de su propia clave.
 */
function groupIdOf(source: GroupKeySource, zone: string): SQL<string> {
  return sql<string>`case
    when ${source.groupKey} = 'followers'
      then ${source.groupKey} || ':' || to_char((${source.createdAt} at time zone ${zone})::date, 'YYYY-MM-DD')
    else ${source.groupKey}
  end`;
}

/**
 * Las filas visibles con su clave de entrada ya materializada como columna.
 * Agrupar por una columna (y no por una expresión `CASE`) evita que Postgres
 * compare el `SELECT` con el `GROUP BY` de forma sintáctica y no los reconozca.
 */
function groupedNotifications(recipientId: string, zone: string, tab: NotificationTab) {
  const source = visibleNotifications(recipientId, tab);
  return db
    .select({
      groupId: groupIdOf(source, zone).as("group_id"),
      kind: source.kind,
      actorId: source.actorId,
      createdAt: source.createdAt,
      readAt: source.readAt,
      actorUsername: source.actorUsername,
      actorDisplayName: source.actorDisplayName,
      actorAvatarImageId: source.actorAvatarImageId,
      artistId: source.artistId,
      artistName: source.artistName,
      rootId: source.rootId,
      moderationAction: source.moderationAction,
      moderationReason: source.moderationReason,
      moderationContentType: source.moderationContentType,
      milestone: source.milestone,
      listId: source.listId,
      listTitle: source.listTitle,
      listKind: source.listKind,
      releaseGroupId: source.releaseGroupId,
      releaseTitle: source.releaseTitle,
      releaseArtistName: source.releaseArtistName,
      releaseCategory: source.releaseCategory,
      releasePrimaryType: source.releasePrimaryType,
      releaseDate: source.releaseDate,
      releaseCoverUrl: source.releaseCoverUrl,
    })
    .from(source)
    .as("grouped_notification");
}

type GroupedSource = ReturnType<typeof groupedNotifications>;

export interface ListNotificationGroupsOptions {
  /** Cursor opaco devuelto por la llamada anterior. */
  cursor?: string | null;
  /** Zona IANA del lector (`tz`); sin ella, UTC. */
  timeZone?: string | null;
  /** Pestaña: "Para ti" por defecto (compatible con la Fase 1). */
  tab?: NotificationTab;
  pageSize?: number;
}

/**
 * Página de entradas agrupadas, de la más reciente a la más antigua. El cursor
 * es `(max(created_at), group_id)`, así una entrada que recibe eventos nuevos
 * mientras se pagina no se salta ni se repite.
 */
export async function listNotificationGroups(
  recipientId: string,
  options: ListNotificationGroupsOptions = {},
): Promise<NotificationPage> {
  const zone = parseTimeZone(options.timeZone) ?? DEFAULT_TIME_ZONE;
  const tab = options.tab ?? "for_you";
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const cursor = parseCursor(options.cursor);

  const source = groupedNotifications(recipientId, zone, tab);
  const lastAtOfGroup = sql`max(${source.createdAt})`;

  const baseQuery = db
    .select({
      id: source.groupId,
      kind: sql<NotificationKind>`case
        when bool_or(${source.kind} = 'comment_reply') then 'comment_reply'
        else min(${source.kind}) end`,
      lastAt: sql<string>`to_json(${lastAtOfGroup}) #>> '{}'`,
      unread: sql<boolean>`bool_or(${source.readAt} is null)`,
      eventCount: sql<number>`count(*)::int`,
      actorCount: sql<number>`count(distinct ${source.actorId})::int`,
      // Campos del destino: se toman del evento más reciente del grupo.
      artistId: sql<string | null>`(array_agg(${source.artistId} order by ${source.createdAt} desc))[1]`,
      artistName: sql<string | null>`(array_agg(${source.artistName} order by ${source.createdAt} desc))[1]`,
      rootId: sql<string | null>`(array_agg(${source.rootId} order by ${source.createdAt} desc))[1]`,
      actorUsername: sql<string | null>`(array_agg(${source.actorUsername} order by ${source.createdAt} desc))[1]`,
      moderationAction: sql<string | null>`(array_agg(${source.moderationAction} order by ${source.createdAt} desc))[1]`,
      moderationReason: sql<string | null>`(array_agg(${source.moderationReason} order by ${source.createdAt} desc))[1]`,
      moderationContentType: sql<string | null>`(array_agg(${source.moderationContentType} order by ${source.createdAt} desc))[1]`,
      // Un grupo de hitos muestra el hito más alto.
      milestone: sql<number | null>`max(${source.milestone})`,
      listId: sql<string | null>`(array_agg(${source.listId} order by ${source.createdAt} desc))[1]`,
      listTitle: sql<string | null>`(array_agg(${source.listTitle} order by ${source.createdAt} desc))[1]`,
      listKind: sql<string | null>`(array_agg(${source.listKind} order by ${source.createdAt} desc))[1]`,
      releaseGroupId: sql<string | null>`(array_agg(${source.releaseGroupId} order by ${source.createdAt} desc))[1]`,
      releaseTitle: sql<string | null>`(array_agg(${source.releaseTitle} order by ${source.createdAt} desc))[1]`,
      releaseArtistName: sql<string | null>`(array_agg(${source.releaseArtistName} order by ${source.createdAt} desc))[1]`,
      releaseCategory: sql<string | null>`(array_agg(${source.releaseCategory} order by ${source.createdAt} desc))[1]`,
      releasePrimaryType: sql<string | null>`(array_agg(${source.releasePrimaryType} order by ${source.createdAt} desc))[1]`,
      releaseDate: sql<string | null>`(array_agg(${source.releaseDate} order by ${source.createdAt} desc))[1]`,
      releaseCoverUrl: sql<string | null>`(array_agg(${source.releaseCoverUrl} order by ${source.createdAt} desc))[1]`,
    })
    .from(source)
    .groupBy(source.groupId)
    .orderBy(desc(lastAtOfGroup), desc(source.groupId))
    .limit(pageSize + 1);

  const rows = cursor
    ? await baseQuery.having(
        sql`(${lastAtOfGroup}, ${source.groupId}) < (${cursor.lastAt}::timestamptz, ${cursor.id}::text)`,
      )
    : await baseQuery;

  const page = rows.slice(0, pageSize);
  const actors = await actorsByGroup(source, page.map((row) => row.id));
  const last = page[page.length - 1];

  return {
    groups: page.map((row) => toGroup(row, actors.get(row.id) ?? [])),
    nextCursor:
      rows.length > pageSize && last
        ? encodeCursor({ lastAt: last.lastAt, id: last.id })
        : null,
  };
}

/**
 * Contador de la campana (D6): entradas con al menos una fila no leída creada
 * después de la última vez que la persona abrió la bandeja. Usa el índice
 * parcial de no leídas y no trae ninguna fila.
 */
export async function countUnseen(recipientId: string, timeZone?: string | null): Promise<number> {
  const zone = parseTimeZone(timeZone) ?? DEFAULT_TIME_ZONE;
  const source = visibleForYouKeys(recipientId);

  const [row] = await db
    .select({ count: sql<number>`count(distinct ${groupIdOf(source, zone)})::int` })
    .from(source)
    .where(
      and(
        isNull(source.readAt),
        sql`${source.createdAt} > coalesce(
          (select ${appUser.notificationsSeenAt} from ${appUser} where ${appUser.id} = ${recipientId}),
          '-infinity'::timestamptz
        )`,
      ),
    );

  return row?.count ?? 0;
}

/**
 * ¿Hay novedades de lanzamiento sin leer desde la última vez que se abrió
 * "Novedades"? El punto de la pestaña no lleva cifra (D7).
 */
export async function hasNewReleases(recipientId: string): Promise<boolean> {
  const source = visibleReleaseKeys(recipientId);

  const [row] = await db
    .select({ one: sql<number>`1` })
    .from(source)
    .where(
      and(
        isNull(source.readAt),
        sql`${source.createdAt} > coalesce(
          (select ${appUser.notificationsReleasesSeenAt} from ${appUser} where ${appUser.id} = ${recipientId}),
          '-infinity'::timestamptz
        )`,
      ),
    )
    .limit(1);

  return row !== undefined;
}

/**
 * Marca como leídas las entradas indicadas (o todas) del destinatario. Nunca
 * toca filas de otra persona: el `recipient_id` va siempre en el `WHERE`.
 * La clave de un grupo de seguidores lleva su día local; se traduce al
 * conjunto de filas de ese día en la zona recibida.
 */
export async function markRead(
  recipientId: string,
  input: { groupKeys: readonly string[] } | { all: true },
  timeZone?: string | null,
): Promise<void> {
  const zone = parseTimeZone(timeZone) ?? DEFAULT_TIME_ZONE;
  const now = new Date();

  if ("all" in input) {
    await db
      .update(notification)
      .set({ readAt: now })
      .where(and(eq(notification.recipientId, recipientId), isNull(notification.readAt)));
    return;
  }

  if (input.groupKeys.length === 0) return;

  const plainKeys = new Set<string>();
  const followerDays: string[] = [];
  for (const key of input.groupKeys) {
    if (key.startsWith("followers:")) {
      const day = key.slice("followers:".length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw invalidGroupKey();
      followerDays.push(day);
    } else {
      plainKeys.add(key);
    }
  }

  const conditions: SQL[] = [];
  if (plainKeys.size > 0) {
    conditions.push(inArray(notification.groupKey, [...plainKeys]));
  }
  for (const day of followerDays) {
    conditions.push(
      sql`(${notification.groupKey} = 'followers'
        and (${notification.createdAt} at time zone ${zone})::date = ${day}::date)`,
    );
  }

  await db
    .update(notification)
    .set({ readAt: now })
    .where(
      and(
        eq(notification.recipientId, recipientId),
        isNull(notification.readAt),
        or(...conditions),
      ),
    );
}

/**
 * Registra que la persona abrió la bandeja: el contador vuelve a 0, pero las
 * entradas siguen sin leer hasta que se abran o se marquen (D6). Abrir
 * "Novedades" mueve su propia marca y no la de "Para ti" (D7).
 */
export async function markSeen(
  recipientId: string,
  tab: NotificationTab = "for_you",
): Promise<void> {
  const now = new Date();
  await db
    .update(appUser)
    .set(
      tab === "releases"
        ? { notificationsReleasesSeenAt: now }
        : { notificationsSeenAt: now },
    )
    .where(eq(appUser.id, recipientId));
}

/**
 * Retención en código (D10): borra las leídas de más de 90 días y cualquier
 * notificación de más de 180, solo del destinatario. Se llama desde el
 * `after()` del listado para no depender de un proceso operativo.
 */
export async function pruneNotifications(recipientId: string, now = new Date()): Promise<void> {
  const readCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const hardCutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  await db
    .delete(notification)
    .where(
      and(
        eq(notification.recipientId, recipientId),
        or(
          and(sql`${notification.readAt} is not null`, lt(notification.createdAt, readCutoff)),
          lt(notification.createdAt, hardCutoff),
        ),
      ),
    );
}

// ---------------------------------------------------------------------------
// Internos
// ---------------------------------------------------------------------------

/**
 * Hasta dos personas por entrada, por orden del evento más reciente. Una sola
 * consulta para toda la página (no una por grupo).
 */
async function actorsByGroup(
  source: GroupedSource,
  groupIds: string[],
): Promise<Map<string, NotificationActor[]>> {
  const byGroup = new Map<string, NotificationActor[]>();
  if (groupIds.length === 0) return byGroup;

  const rows = await db
    .select({
      groupId: source.groupId,
      id: source.actorId,
      username: source.actorUsername,
      displayName: source.actorDisplayName,
      avatarImageId: source.actorAvatarImageId,
      lastAt: sql<Date>`max(${source.createdAt})`,
    })
    .from(source)
    .where(and(inArray(source.groupId, groupIds), sql`${source.actorId} is not null`))
    .groupBy(source.groupId, source.actorId, source.actorUsername, source.actorDisplayName, source.actorAvatarImageId)
    .orderBy(desc(sql`max(${source.createdAt})`));

  const urls = await resolveImageUrls(rows.map((row) => row.avatarImageId));

  for (const row of rows) {
    if (!row.id || !row.username) continue;
    const list = byGroup.get(row.groupId) ?? [];
    // Solo se devuelven los dos primeros nombres; el resto es la cifra del grupo.
    if (list.length < 2) {
      list.push({
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: row.avatarImageId ? (urls.get(row.avatarImageId) ?? null) : null,
      });
    }
    byGroup.set(row.groupId, list);
  }
  return byGroup;
}

type GroupRow = {
  id: string;
  kind: NotificationKind;
  /** ISO 8601 del evento más reciente (texto, no `Date`, para no depender del driver). */
  lastAt: string;
  unread: boolean;
  eventCount: number;
  actorCount: number;
  artistId: string | null;
  artistName: string | null;
  rootId: string | null;
  actorUsername: string | null;
  moderationAction: string | null;
  moderationReason: string | null;
  moderationContentType: string | null;
  milestone: number | null;
  listId: string | null;
  listTitle: string | null;
  listKind: string | null;
  releaseGroupId: string | null;
  releaseTitle: string | null;
  releaseArtistName: string | null;
  releaseCategory: string | null;
  releasePrimaryType: string | null;
  releaseDate: string | null;
  releaseCoverUrl: string | null;
};

function toGroup(row: GroupRow, actors: NotificationActor[]): NotificationGroup {
  return {
    id: row.id,
    kind: row.kind,
    lastAt: row.lastAt,
    unread: row.unread,
    eventCount: row.eventCount,
    actorCount: row.actorCount,
    actors,
    target: targetFor(row),
  };
}

function targetFor(row: GroupRow): NotificationTarget | null {
  if (row.kind === "moderation") {
    if (!row.moderationAction || !row.moderationContentType || !row.moderationReason) return null;
    if (!isModerationAction(row.moderationAction)) return null;
    return {
      type: "moderation",
      action: row.moderationAction,
      contentType: row.moderationContentType as ModerationContentType,
      reason: row.moderationReason,
    };
  }

  if (row.kind === "comment_like_milestone") {
    if (!row.artistId || !row.artistName || !row.rootId || row.milestone === null) return null;
    return {
      type: "comment",
      artistId: row.artistId,
      artistName: row.artistName,
      rootId: row.rootId,
      milestone: row.milestone,
    };
  }

  if (row.kind === "list_save_milestone") {
    if (!row.listId || row.listTitle === null || row.milestone === null) return null;
    return {
      type: "list",
      listId: row.listId,
      title: row.listTitle,
      isCamino: row.listKind === "custom_journey",
      milestone: row.milestone,
    };
  }

  if (
    row.kind === "artist_release" ||
    row.kind === "artist_release_announced" ||
    row.kind === "artist_single"
  ) {
    if (!row.releaseGroupId || row.releaseTitle === null) return null;
    return {
      type: "release",
      releaseGroupId: row.releaseGroupId,
      title: row.releaseTitle,
      artistName: row.releaseArtistName ?? "",
      category: normaliseCategory(row.releasePrimaryType, row.releaseCategory),
      releaseDate: row.releaseDate,
      coverUrl: row.releaseCoverUrl,
    };
  }

  if (row.artistId && row.artistName && row.rootId) {
    return { type: "artist", artistId: row.artistId, artistName: row.artistName, rootId: row.rootId };
  }

  if (row.actorUsername) return { type: "profile", username: row.actorUsername };
  return null;
}

/** Álbum / EP / sencillo a partir de los tipos crudos de MusicBrainz y la categoría propia. */
function normaliseCategory(
  primaryType: string | null,
  category: string | null,
): "album" | "ep" | "single" {
  if (primaryType === "Single") return "single";
  if (primaryType === "EP") return "ep";
  if (primaryType === "Album") return "album";
  return category === "single_ep" ? "single" : "album";
}

function isModerationAction(value: string): value is ModerationAction {
  return (MODERATION_ACTIONS as readonly string[]).includes(value);
}

/**
 * Cursor `fecha ISO | clave de entrada`. La clave no puede contener `|` (las
 * claves son `thread:<uuid>`, `follow:<uuid>`, `moderation:<uuid>` o
 * `followers:<aaaa-mm-dd>`), así que la primera barra separa sin ambigüedad.
 */
function encodeCursor(cursor: { lastAt: string; id: string }): string {
  // `lastAt` va tal cual sale de Postgres (microsegundos): pasarlo por `Date` lo recortaría a
  // milisegundos y la comparación del cursor podría saltarse una entrada.
  return `${cursor.lastAt}|${cursor.id}`;
}

function parseCursor(cursor: string | null | undefined): { lastAt: string; id: string } | null {
  if (!cursor) return null;
  const index = cursor.indexOf("|");
  if (index <= 0 || index === cursor.length - 1) throw invalidCursor();
  const lastAt = cursor.slice(0, index);
  const id = cursor.slice(index + 1);
  if (Number.isNaN(new Date(lastAt).getTime())) throw invalidCursor();
  return { lastAt, id };
}

function invalidCursor() {
  return new ApiError("VALIDATION_ERROR", 400, 'El valor de "cursor" no es válido');
}

function invalidGroupKey() {
  return new ApiError("VALIDATION_ERROR", 400, 'El valor de "groupKeys" no es válido');
}
