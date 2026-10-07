import { and, desc, eq, ilike, inArray, isNull, ne, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  appUser,
  artist,
  artistFollow,
  collectionEntry,
  comment,
  favorite,
  listenEntry,
  rating,
  recording,
  releaseGroup,
  review,
  userFollow,
  userList,
  wantedEntry,
} from "@/db/schema";
import type { CommentTopic } from "@/db/schema";
import { rootCommentsOnly } from "@/services/social/comment-roots";
import { ApiError } from "@/lib/api/errors";
import type { FeedKind } from "@/lib/api/schemas";
import type { Audience } from "@/services/social/types";
import type { CollectionFormat } from "@/services/collection/vocabulary";
import { activeUserCondition } from "@/services/auth/account-status";
import { resolveImageUrls } from "@/services/storage/avatar-urls";

export type FeedAuthor = { id: string; username: string; displayName: string | null; avatarUrl?: string | null };

export interface FeedListenEntry {
  kind: "listen";
  id: string;
  listenContext: "first_listen" | "relisten" | "rediscovery";
  body: string | null;
  reaction: "liked" | "loved" | "obsessed" | "neutral" | "disliked" | null;
  audience: Audience;
  createdAt: string;
  target: {
    type: "artist" | "release-group" | "recording";
    id: string;
    title: string;
    subtitle: string | null;
    artistName: string | null;
    artistId: string | null;
    // Álbum que contiene esta grabación, cuando el objetivo es una canción
    // (openspec: add-feed-album-sweep) — null para objetivos de artista o
    // álbum. Solo alimenta la detección de "barrido de álbum" en
    // `feed-grouping.ts`; no se muestra en la fila individual.
    albumId: string | null;
    albumTitle: string | null;
    coverThumbUrl: string | null;
  };
  author: FeedAuthor;
}

export interface FeedFavorite {
  kind: "favorite";
  id: string;
  targetType: "artist" | "release-group" | "recording";
  audience: Audience;
  createdAt: string;
  target: {
    id: string;
    title: string;
    artistName: string | null;
    artistId: string | null;
    // Ver FeedListenEntry.target.albumId (openspec: add-feed-album-sweep) —
    // marcar como favorito también cuenta como señal de "álbum completo".
    albumId: string | null;
    albumTitle: string | null;
    coverThumbUrl: string | null;
  };
  author: FeedAuthor;
}

export interface FeedListEvent {
  kind: "list";
  id: string;
  event: "created" | "updated";
  audience: Audience;
  createdAt: string;
  list: { id: string; title: string; entityType: "artist" | "release-group" | "recording" };
  author: FeedAuthor;
}

export interface FeedRating {
  kind: "rating";
  id: string;
  stars: string;
  detailedScore: number | null;
  createdAt: string;
  target: {
    type: "artist" | "release-group" | "recording";
    id: string;
    title: string;
    artistName: string | null;
    artistId: string | null;
    // Ver FeedListenEntry.target.albumId (openspec: add-feed-album-sweep).
    albumId: string | null;
    albumTitle: string | null;
    coverThumbUrl: string | null;
  };
  author: FeedAuthor;
}

export interface FeedComment {
  kind: "comment";
  id: string;
  body: string;
  /** Tema del comentario de artista (add-artist-comment-topics); `null` en álbum y canción. */
  topic?: CommentTopic | null;
  createdAt: string;
  target: {
    type: "artist" | "release-group" | "recording";
    id: string;
    title: string;
    artistName: string | null;
    artistId: string | null;
    coverThumbUrl: string | null;
  };
  author: FeedAuthor;
}

// Reseña de álbum como entrada de feed (openspec: rework-feed-tiers). Acto
// expresivo tier 1, misma forma que un comentario más el `title` opcional.
// Una sola entrada por (usuario, álbum): `review` tiene índice único parcial
// por objetivo. `createdAt` refleja `updated_at` (la edición vigente).
export interface FeedReview {
  kind: "review";
  id: string;
  title: string | null;
  body: string;
  createdAt: string;
  target: {
    type: "artist" | "release-group" | "recording";
    id: string;
    title: string;
    artistName: string | null;
    artistId: string | null;
    coverThumbUrl: string | null;
  };
  author: FeedAuthor;
}

// Tier 4 activado en la línea de tiempo principal (openspec:
// add-feed-kind-differentiation): sin objetivo de catálogo, el "objetivo" es
// la persona seguida. Antes solo vivía como resumen agrupado en
// `feed-ambient-events`; ahora es una fila propia acá y se retiró de ahí.
export interface FeedFollow {
  kind: "follow";
  id: string;
  createdAt: string;
  followedUser: FeedAuthor;
  author: FeedAuthor;
}

// Tier 4, misma activación que FeedFollow (openspec:
// add-artist-follow-feed-entry): sin objetivo de catálogo, el "objetivo" es
// el artista seguido. A diferencia de FeedFollow, no hay regla de
// visibilidad de perfil — un artista no tiene perfil privado.
export interface FeedFollowArtist {
  kind: "follow-artist";
  id: string;
  createdAt: string;
  artist: { id: string; name: string };
  author: FeedAuthor;
}

// Objetivo de una entrada de colección o wishlist: siempre un álbum. Misma
// forma que `FeedComment.target` para reusar el render de título/artista.
export interface FeedAlbumTarget {
  type: "artist" | "release-group" | "recording";
  id: string;
  title: string;
  artistName: string | null;
  artistId: string | null;
  coverThumbUrl: string | null;
}

// Alta en la colección física (openspec: expand-feed-coverage). Antes vivía
// solo en la franja ambiente al pie de `/me/feed`, ya retirada. Una entrada
// por copia (la colección admite varias por álbum); la nota no viaja: es una
// nota de inventario, no prosa para el feed.
export interface FeedCollection {
  kind: "collection";
  id: string;
  format: CollectionFormat;
  audience: Audience;
  createdAt: string;
  target: FeedAlbumTarget;
  author: FeedAuthor;
}

// Alta en la wishlist, "En tu búsqueda" (openspec: expand-feed-coverage).
// `format: null` = "cualquier formato". Solo las entradas con audiencia
// `followers`/`public` (columna de la migración 0061).
export interface FeedWanted {
  kind: "wanted";
  id: string;
  format: CollectionFormat | null;
  audience: Audience;
  createdAt: string;
  target: FeedAlbumTarget;
  author: FeedAuthor;
}

// Camino creado o completado (openspec: expand-feed-coverage, D2/D3). El id
// es el del Camino en ambos eventos — el render arma la key con `event`. El
// completado se deriva en lectura (`CAMINO_COMPLETED_AT_SQL`), nunca se
// persiste.
export interface FeedCamino {
  kind: "camino";
  id: string;
  event: "created" | "completed";
  audience: Audience;
  createdAt: string;
  camino: { id: string; title: string; albumCount: number };
  author: FeedAuthor;
}

export type FeedEntry =
  | FeedListenEntry
  | FeedFavorite
  | FeedListEvent
  | FeedRating
  | FeedComment
  | FeedReview
  | FeedFollow
  | FeedFollowArtist
  | FeedCollection
  | FeedWanted
  | FeedCamino;

// Fuente única en `lib/api/schemas` (también la usa el selector de tipo de
// `/me/feed`, en el cliente).
export { FEED_KINDS, type FeedKind } from "@/lib/api/schemas";

// Filtros combinables de `listFeed` — cada campo es independiente y opcional.
// `authorId` SHALL pertenecer a los seguidos aceptados del lector (se valida
// antes de ejecutar cualquier query); `q` busca por coincidencia parcial sobre
// el título del objetivo (no sobre el cuerpo de comentarios o notas).
export interface FeedFilters {
  kind?: FeedKind;
  authorId?: string;
  q?: string;
}

const BLOCKED_SQL = (viewerId: string, authorId: unknown) =>
  sql`NOT EXISTS (
    SELECT 1 FROM user_block b
    WHERE (b.blocker_id = ${viewerId} AND b.blocked_id = ${authorId})
       OR (b.blocker_id = ${authorId} AND b.blocked_id = ${viewerId})
  )`;

// Nombre del artista principal acreditado de un álbum o canción, para el
// renglón "título · artista" del feed. Subquery escalar: no multiplica filas
// aunque el objetivo tenga varios créditos primarios (toma el de menor
// `position`). Para objetivos de tipo artista ambas columnas son NULL y
// devuelve NULL (el título ya es el artista).
//
// Los parámetros también aceptan un fragmento `SQL`: en un `SELECT` de una sola
// tabla (sin joins) Drizzle renderiza `${tabla.id}` como un `"id"` sin
// calificar, que dentro de esta subconsulta (`credit` + `artist`) es ambiguo
// (error 42702). En ese caso hay que pasar la correlación con la tabla
// escrita: `sql.raw('"release_group"."id"')`. Ver la memoria raw-sql-gotchas.
export const PRIMARY_ARTIST_SQL = (releaseGroupIdCol: AnyColumn | SQL, recordingIdCol: AnyColumn | SQL) =>
  sql<string | null>`(
    SELECT a.name FROM credit c
    JOIN artist a ON a.id = c.artist_id
    WHERE (
      (${releaseGroupIdCol} IS NOT NULL AND c.release_group_id = ${releaseGroupIdCol})
      OR (${recordingIdCol} IS NOT NULL AND c.recording_id = ${recordingIdCol})
    ) AND c.role = 'primary'
    ORDER BY c.position
    LIMIT 1
  )`;

// Id del mismo artista principal acreditado que `PRIMARY_ARTIST_SQL`, para
// poder enlazar el renglón "· artista" a su página (openspec:
// add-feed-artist-link). Subquery hermana, misma condición — se piden por
// separado (no como fila compuesta) porque el resto del archivo ya trae cada
// columna de un `SELECT` plano.
export const PRIMARY_ARTIST_ID_SQL = (releaseGroupIdCol: AnyColumn | SQL, recordingIdCol: AnyColumn | SQL) =>
  sql<string | null>`(
    SELECT a.id FROM credit c
    JOIN artist a ON a.id = c.artist_id
    WHERE (
      (${releaseGroupIdCol} IS NOT NULL AND c.release_group_id = ${releaseGroupIdCol})
      OR (${recordingIdCol} IS NOT NULL AND c.recording_id = ${recordingIdCol})
    ) AND c.role = 'primary'
    ORDER BY c.position
    LIMIT 1
  )`;

// Álbum (release-group) que contiene una grabación, vía su edición ingerida
// (openspec: add-feed-album-sweep): una grabación normalmente pertenece a una
// sola release ingerida (la representativa de su álbum, ver
// `representative-release.ts`), así que el `LIMIT 1` no descarta ediciones
// reales en el caso común. Subqueries escalares hermanas (id/título), mismo
// patrón que `PRIMARY_ARTIST_SQL`/`PRIMARY_ARTIST_ID_SQL` — alimentan
// exclusivamente la detección de "barrido de álbum" en `feed-grouping.ts`, no
// se muestran en la fila individual.
export const RECORDING_ALBUM_ID_SQL = (recordingIdCol: AnyColumn) =>
  sql<string | null>`(
    SELECT rel.release_group_id FROM track t
    JOIN release rel ON rel.id = t.release_id
    WHERE t.recording_id = ${recordingIdCol}
    LIMIT 1
  )`;

export const RECORDING_ALBUM_TITLE_SQL = (recordingIdCol: AnyColumn) =>
  sql<string | null>`(
    SELECT rg.title FROM track t
    JOIN release rel ON rel.id = t.release_id
    JOIN release_group rg ON rg.id = rel.release_group_id
    WHERE t.recording_id = ${recordingIdCol}
    LIMIT 1
  )`;

// Carátula de un álbum representativo que contenga una grabación: el primero,
// por fecha de alta, entre los que sí tienen carátula — mismo criterio que
// `LIST_ITEM_SONG_COVER` en `services/lists/lists.ts` (duplicado ahí por ahora;
// unificar si aparece un tercer consumidor). Usado por el himno del perfil
// (openspec: rework-user-profile), que antes no mostraba carátula real.
export const RECORDING_COVER_SQL = (recordingIdCol: AnyColumn) =>
  sql<string | null>`(
    SELECT rg.cover_thumb_url FROM track t
    JOIN release r ON r.id = t.release_id
    JOIN release_group rg ON rg.id = r.release_group_id
    WHERE t.recording_id = ${recordingIdCol}
      AND rg.cover_thumb_url IS NOT NULL
    ORDER BY rg.created_at, rg.id
    LIMIT 1
  )`;

// Condición de búsqueda por título del objetivo, sobre las mismas columnas de
// artist/releaseGroup/recording que cada fuente (listen/favorite/rating/
// comment) ya deja unidas, más el artista principal acreditado (álbumes y
// canciones) — sin esto último, buscar "Fleetwood Mac" no encontraría sus
// canciones, solo entradas cuyo objetivo es la artista misma. Mismo criterio
// que `listMyDiary` (add-diary-filters). Devuelve un array (vacío o de un
// elemento) para poder spread-earlo directo dentro de `and(...)` sin
// condicionales sueltos. La fuente de listas no la usa (no tiene esos joins)
// — filtra por `ilike(userList.title, ...)` directo donde se arma esa query.
function titleSearchCondition(pattern: string | null, releaseGroupIdCol: AnyColumn, recordingIdCol: AnyColumn): SQL[] {
  if (!pattern) return [];
  const condition = or(
    ilike(artist.name, pattern),
    ilike(releaseGroup.title, pattern),
    ilike(recording.title, pattern),
    sql`${PRIMARY_ARTIST_SQL(releaseGroupIdCol, recordingIdCol)} ILIKE ${pattern}`,
  );
  return condition ? [condition] : [];
}

// Para objetivos que siempre son un álbum (colección, wishlist): la columna de
// grabación de `PRIMARY_ARTIST_SQL`/`PRIMARY_ARTIST_ID_SQL` no existe ahí.
const NO_RECORDING = sql`NULL::uuid`;

// Búsqueda por título para fuentes cuyo objetivo es siempre un álbum: título
// del álbum o su artista principal acreditado — mismo criterio que
// `titleSearchCondition`, sin los joins de artista/canción que esas fuentes no
// tienen.
function albumSearchCondition(pattern: string | null, releaseGroupIdCol: AnyColumn): SQL[] {
  if (!pattern) return [];
  const condition = or(
    ilike(releaseGroup.title, pattern),
    sql`${PRIMARY_ARTIST_SQL(releaseGroupIdCol, NO_RECORDING)} ILIKE ${pattern}`,
  );
  return condition ? [condition] : [];
}

/**
 * Instante en que un Camino quedó completo, derivado en lectura (openspec:
 * expand-feed-coverage, D2): NULL si no tiene álbumes o si a alguno le falta
 * una escucha del dueño; si no, el mayor entre los álbumes de
 * `greatest(alta del álbum, primera escucha del dueño)` — la primera escucha
 * del último álbum en cubrirse, o el alta de un álbum ya escuchado. Mismo
 * criterio de progreso que `countsByListId` (cualquier escucha del dueño).
 * Correlación con el literal `"user_list"` (ver raw-sql-gotchas): la fuente
 * se consulta desde `user_list`.
 */
export const CAMINO_COMPLETED_AT_SQL = sql<Date | null>`(
  SELECT CASE WHEN count(*) > 0 AND bool_and(fl.first_at IS NOT NULL)
              THEN max(greatest(i.created_at, fl.first_at)) END
  FROM user_list_item i
  LEFT JOIN LATERAL (
    SELECT min(le.created_at) AS first_at
    FROM listen_entry le
    WHERE le.user_id = "user_list"."owner_id" AND le.release_group_id = i.release_group_id
  ) fl ON true
  WHERE i.list_id = "user_list"."id"
)`;

export const CAMINO_ALBUM_COUNT_SQL = sql<number>`(
  SELECT count(*)::int FROM user_list_item i WHERE i.list_id = "user_list"."id"
)`;

/**
 * Completa `author.avatarUrl` de las entradas de UNA página con una consulta
 * por lote (foto de perfil, openspec: connect-avatar-upload). Se hace sobre la
 * página ya recortada, no sobre cada fuente, para no pagar el join en filas que
 * nunca se devuelven.
 */
async function attachAuthorAvatars(entries: { author: FeedAuthor }[]): Promise<void> {
  const authorIds = [...new Set(entries.map((entry) => entry.author.id))];
  if (authorIds.length === 0) return;
  const rows = await db
    .select({ id: appUser.id, avatarImageId: appUser.avatarImageId })
    .from(appUser)
    .where(inArray(appUser.id, authorIds));
  const urls = await resolveImageUrls(rows.map((row) => row.avatarImageId));
  const byUser = new Map(rows.map((row) => [row.id, row.avatarImageId ? (urls.get(row.avatarImageId) ?? null) : null]));
  for (const entry of entries) entry.author.avatarUrl = byUser.get(entry.author.id) ?? null;
}

// ---------------------------------------------------------------------------
// Fuentes de colección, wishlist y Camino (openspec: expand-feed-coverage).
// Las comparten `listFeed` (actividad de seguidos, con audiencia y bloqueo) y
// `listMyRecentActivity` (rastro propio, sin filtro de audiencia): cada caller
// pasa su `where`. Misma forma `select…from…leftJoin…where…orderBy…limit` que
// el resto de las fuentes.
// ---------------------------------------------------------------------------

/** Altas en la colección física, más recientes primero. */
export function collectionFeedQuery(where: SQL | undefined, limit: number) {
  return db
    .select({
      id: collectionEntry.id,
      format: collectionEntry.format,
      audience: collectionEntry.audience,
      createdAt: collectionEntry.createdAt,
      releaseGroupId: collectionEntry.releaseGroupId,
      releaseTitle: releaseGroup.title,
      releaseCover: releaseGroup.coverThumbUrl,
      creditedArtist: PRIMARY_ARTIST_SQL(collectionEntry.releaseGroupId, NO_RECORDING),
      creditedArtistId: PRIMARY_ARTIST_ID_SQL(collectionEntry.releaseGroupId, NO_RECORDING),
      authorId: collectionEntry.userId,
      authorUsername: appUser.username,
      authorDisplayName: appUser.displayName,
    })
    .from(collectionEntry)
    .leftJoin(releaseGroup, eq(collectionEntry.releaseGroupId, releaseGroup.id))
    .leftJoin(appUser, eq(collectionEntry.userId, appUser.id))
    .where(where)
    .orderBy(desc(collectionEntry.createdAt), desc(collectionEntry.id))
    .limit(limit);
}

/** Altas en la wishlist ("En tu búsqueda"), más recientes primero. */
export function wantedFeedQuery(where: SQL | undefined, limit: number) {
  return db
    .select({
      id: wantedEntry.id,
      format: wantedEntry.format,
      audience: wantedEntry.audience,
      createdAt: wantedEntry.createdAt,
      releaseGroupId: wantedEntry.releaseGroupId,
      releaseTitle: releaseGroup.title,
      releaseCover: releaseGroup.coverThumbUrl,
      creditedArtist: PRIMARY_ARTIST_SQL(wantedEntry.releaseGroupId, NO_RECORDING),
      creditedArtistId: PRIMARY_ARTIST_ID_SQL(wantedEntry.releaseGroupId, NO_RECORDING),
      authorId: wantedEntry.userId,
      authorUsername: appUser.username,
      authorDisplayName: appUser.displayName,
    })
    .from(wantedEntry)
    .leftJoin(releaseGroup, eq(wantedEntry.releaseGroupId, releaseGroup.id))
    .leftJoin(appUser, eq(wantedEntry.userId, appUser.id))
    .where(where)
    .orderBy(desc(wantedEntry.createdAt), desc(wantedEntry.id))
    .limit(limit);
}

/**
 * Condiciones de cualquier entrada de Camino, sin audiencia ni bloqueo (que
 * agrega cada caller): subtipo `custom_journey`, ni oculto por moderación ni
 * archivado. Los Recorridos (`artist_journey`) nunca entran: nacen `private`
 * y no tienen lectura ajena; trackear un Camino ajeno tampoco (es privado de
 * quien trackea, `list_save`).
 */
export function caminoBaseConditions(ownerIds: string[]): SQL[] {
  return [
    inArray(userList.ownerId, ownerIds),
    eq(userList.kind, "custom_journey"),
    eq(userList.moderationStatus, "visible"),
    isNull(userList.journeyArchivedAt),
  ];
}

/**
 * Caminos creados (D3), por fecha de creación — no `updated_at`: editar o
 * archivar no genera evento. Los Caminos siguen excluidos de los eventos de
 * lista; acá tienen su propio `kind`.
 */
export function caminoCreatedFeedQuery(where: SQL | undefined, limit: number) {
  return db
    .select({
      id: userList.id,
      title: userList.title,
      audience: userList.audience,
      at: userList.createdAt,
      albumCount: CAMINO_ALBUM_COUNT_SQL,
      authorId: userList.ownerId,
      authorUsername: appUser.username,
      authorDisplayName: appUser.displayName,
    })
    .from(userList)
    .leftJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(where)
    .orderBy(desc(userList.createdAt), desc(userList.id))
    .limit(limit);
}

/**
 * Caminos completados (D2): derivado en lectura con `CAMINO_COMPLETED_AT_SQL`,
 * sin tabla de eventos; la subconsulta solo se evalúa sobre los Caminos que ya
 * pasaron el resto de las condiciones.
 */
export function caminoCompletedFeedQuery(where: SQL | undefined, limit: number) {
  return db
    .select({
      id: userList.id,
      title: userList.title,
      audience: userList.audience,
      at: CAMINO_COMPLETED_AT_SQL,
      albumCount: CAMINO_ALBUM_COUNT_SQL,
      authorId: userList.ownerId,
      authorUsername: appUser.username,
      authorDisplayName: appUser.displayName,
    })
    .from(userList)
    .leftJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(and(where, sql`${CAMINO_COMPLETED_AT_SQL} IS NOT NULL`))
    .orderBy(desc(CAMINO_COMPLETED_AT_SQL), desc(userList.id))
    .limit(limit);
}

interface AlbumSourceRow {
  id: string;
  format: string | null;
  audience: string;
  createdAt: Date;
  releaseGroupId: string;
  releaseTitle: string | null;
  releaseCover: string | null;
  creditedArtist: string | null;
  creditedArtistId: string | null;
  authorId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
}

function albumTarget(row: AlbumSourceRow): FeedAlbumTarget {
  return {
    type: "release-group",
    id: row.releaseGroupId,
    title: row.releaseTitle ?? "",
    artistName: row.creditedArtist,
    artistId: row.creditedArtistId,
    coverThumbUrl: row.releaseCover,
  };
}

function sourceAuthor(row: { authorId: string; authorUsername: string | null; authorDisplayName: string | null }): FeedAuthor {
  return { id: row.authorId, username: row.authorUsername ?? "", displayName: row.authorDisplayName };
}

export function collectionFeedEntry(row: AlbumSourceRow): FeedCollection {
  return {
    kind: "collection",
    id: row.id,
    format: row.format as CollectionFormat,
    audience: row.audience as Audience,
    createdAt: row.createdAt.toISOString(),
    target: albumTarget(row),
    author: sourceAuthor(row),
  };
}

export function wantedFeedEntry(row: AlbumSourceRow): FeedWanted {
  return {
    kind: "wanted",
    id: row.id,
    format: row.format as CollectionFormat | null,
    audience: row.audience as Audience,
    createdAt: row.createdAt.toISOString(),
    target: albumTarget(row),
    author: sourceAuthor(row),
  };
}

interface CaminoSourceRow {
  id: string;
  title: string;
  audience: string;
  // Una subconsulta escalar en `sql` vuelve del driver como texto, no como
  // `Date` (solo las columnas tipadas se mapean): se normaliza en el mapeo.
  at: Date | string | null;
  albumCount: number;
  authorId: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
}

function caminoFeedEntry(row: CaminoSourceRow, event: FeedCamino["event"], at: Date | string): FeedCamino {
  return {
    kind: "camino",
    id: row.id,
    event,
    audience: row.audience as Audience,
    createdAt: new Date(at).toISOString(),
    camino: { id: row.id, title: row.title, albumCount: Number(row.albumCount) },
    author: sourceAuthor(row),
  };
}

/** Une las dos fuentes de Camino (creado y completado) en entradas de feed. */
export function caminoFeedEntries(created: CaminoSourceRow[], completed: CaminoSourceRow[]): FeedCamino[] {
  return [
    ...created.flatMap((row) => (row.at ? [caminoFeedEntry(row, "created", row.at)] : [])),
    ...completed.flatMap((row) => (row.at ? [caminoFeedEntry(row, "completed", row.at)] : [])),
  ];
}

/**
 * Personas seguidas (relación aceptada) para poblar el `<select>` de autor del
 * filtro de feed: sin paginar (a diferencia de `listFollowing`, que topea en
 * 50 — un `<select>` nativo necesita la lista completa de antemano), orden
 * alfabético por username.
 */
export async function listFeedAuthors(viewerId: string): Promise<FeedAuthor[]> {
  const rows = await db
    .select({ id: appUser.id, username: appUser.username, displayName: appUser.displayName })
    .from(userFollow)
    .innerJoin(appUser, eq(userFollow.followedId, appUser.id))
    .where(and(eq(userFollow.followerId, viewerId), eq(userFollow.status, "accepted"), activeUserCondition()))
    .orderBy(appUser.username);
  return rows.map((row) => ({ id: row.id, username: row.username ?? "", displayName: row.displayName }));
}

/**
 * Feed de actividad de usuarios seguidos: escuchas, favoritos, eventos de
 * listas (creación o actualización de metadatos), ratings vigentes,
 * comentarios, reseñas, seguimientos, altas de colección y de wishlist y
 * Caminos creados o completados. Se calcula bajo demanda uniendo las fuentes y ordenando
 * por created_at DESC con desempate por fuente e id. Solo incluye actividades
 * visibles según audiencia y sin bloqueo; rating/comment no tienen audiencia
 * propia y se tratan como "public" implícita (ver design.md de
 * add-ratings-comments-feed).
 */
export async function listFeed(
  viewerId: string,
  page = 1,
  pageSize = 20,
  filters: FeedFilters = {},
) {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  // Solo las cuentas ACTIVAS: los eventos de una cuenta desactivada desaparecen del
  // feed (spec account-lifecycle). Como todas las fuentes se acotan por `authorIds`,
  // esto basta para listens, favoritos, listas, ratings, comentarios y reseñas.
  const followed = await db
    .select({ followedId: userFollow.followedId })
    .from(userFollow)
    .innerJoin(appUser, eq(userFollow.followedId, appUser.id))
    .where(and(eq(userFollow.followerId, viewerId), eq(userFollow.status, "accepted"), activeUserCondition()));

  if (followed.length === 0) {
    return { entries: [], page, pageSize, hasNext: false };
  }

  const followedIds = followed.map((r) => r.followedId);

  if (filters.authorId && !followedIds.includes(filters.authorId)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El autor no pertenece a tus seguidos");
  }

  // Con `authorId` se acota a ese único seguido; sin él, a todos — sigue
  // siendo `inArray` en ambos casos para no bifurcar cada query en dos formas.
  const authorIds = filters.authorId ? [filters.authorId] : followedIds;

  const q = filters.q?.trim();
  const searchPattern = q ? `%${q}%` : null;

  // Con `kind` presente, se saltea la query de cualquier otra fuente en vez de
  // traerla y descartarla al fusionar: es a la vez el filtro y una mejora de
  // rendimiento (ver design.md, decisión 1).
  const includeKind = (kind: FeedKind) => !filters.kind || filters.kind === kind;
  // "follow" no es un `FeedKind` filtrable (no tiene título de objetivo que
  // buscar): se saltea directamente si hay cualquier filtro de kind o de
  // texto, en vez de sumarlo a `includeKind`.
  const includeFollow = !filters.kind && !searchPattern;
  // Mismo criterio que "follow": no es un `FeedKind` filtrable ni buscable.
  const includeFollowArtist = !filters.kind && !searchPattern;
  const followedUser = alias(appUser, "followed_user");

  // Se consulta una página ampliada por fuente y se fusiona en memoria: la
  // composición heterogénea no permite paginación SQL única sin una tabla de
  // eventos (se evalúa con volumen real, ver phase-5-design.md §9).
  const extra = 1;
  const perSource = pageSize + extra;

  const [
    listens,
    favorites,
    lists,
    ratings,
    comments,
    reviews,
    follows,
    followArtists,
    collections,
    wanteds,
    caminosCreated,
    caminosCompleted,
  ] = await Promise.all([
    includeKind("listen")
      ? db
          .select({
            id: listenEntry.id,
            listenContext: listenEntry.listenContext,
            body: listenEntry.body,
            reaction: listenEntry.reaction,
            audience: listenEntry.audience,
            createdAt: listenEntry.createdAt,
            artistId: listenEntry.artistId,
            releaseGroupId: listenEntry.releaseGroupId,
            recordingId: listenEntry.recordingId,
            artistName: artist.name,
            creditedArtist: PRIMARY_ARTIST_SQL(listenEntry.releaseGroupId, listenEntry.recordingId),
            creditedArtistId: PRIMARY_ARTIST_ID_SQL(listenEntry.releaseGroupId, listenEntry.recordingId),
            recordingAlbumId: RECORDING_ALBUM_ID_SQL(listenEntry.recordingId),
            recordingAlbumTitle: RECORDING_ALBUM_TITLE_SQL(listenEntry.recordingId),
            releaseTitle: releaseGroup.title,
            releaseCover: releaseGroup.coverThumbUrl,
            recordingTitle: recording.title,
            authorId: listenEntry.userId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
          })
          .from(listenEntry)
          .leftJoin(artist, eq(listenEntry.artistId, artist.id))
          .leftJoin(releaseGroup, eq(listenEntry.releaseGroupId, releaseGroup.id))
          .leftJoin(recording, eq(listenEntry.recordingId, recording.id))
          .leftJoin(appUser, eq(listenEntry.userId, appUser.id))
          .where(
            and(
              inArray(listenEntry.userId, authorIds),
              inArray(listenEntry.audience, ["followers", "public"]),
              BLOCKED_SQL(viewerId, listenEntry.userId),
              ...titleSearchCondition(searchPattern, listenEntry.releaseGroupId, listenEntry.recordingId),
            ),
          )
          .orderBy(desc(listenEntry.createdAt), desc(listenEntry.id))
          .limit(perSource)
      : Promise.resolve([]),

    includeKind("favorite")
      ? db
          .select({
            id: favorite.id,
            audience: favorite.audience,
            createdAt: favorite.createdAt,
            artistId: favorite.artistId,
            releaseGroupId: favorite.releaseGroupId,
            recordingId: favorite.recordingId,
            artistName: artist.name,
            creditedArtist: PRIMARY_ARTIST_SQL(favorite.releaseGroupId, favorite.recordingId),
            creditedArtistId: PRIMARY_ARTIST_ID_SQL(favorite.releaseGroupId, favorite.recordingId),
            recordingAlbumId: RECORDING_ALBUM_ID_SQL(favorite.recordingId),
            recordingAlbumTitle: RECORDING_ALBUM_TITLE_SQL(favorite.recordingId),
            releaseTitle: releaseGroup.title,
            releaseCover: releaseGroup.coverThumbUrl,
            recordingTitle: recording.title,
            authorId: favorite.userId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
          })
          .from(favorite)
          .leftJoin(artist, eq(favorite.artistId, artist.id))
          .leftJoin(releaseGroup, eq(favorite.releaseGroupId, releaseGroup.id))
          .leftJoin(recording, eq(favorite.recordingId, recording.id))
          .leftJoin(appUser, eq(favorite.userId, appUser.id))
          .where(
            and(
              inArray(favorite.userId, authorIds),
              inArray(favorite.audience, ["followers", "public"]),
              BLOCKED_SQL(viewerId, favorite.userId),
              ...titleSearchCondition(searchPattern, favorite.releaseGroupId, favorite.recordingId),
            ),
          )
          .orderBy(desc(favorite.createdAt), desc(favorite.id))
          .limit(perSource)
      : Promise.resolve([]),

    includeKind("list")
      ? db
          .select({
            id: userList.id,
            entityType: userList.entityType,
            title: userList.title,
            audience: userList.audience,
            createdAt: userList.createdAt,
            updatedAt: userList.updatedAt,
            authorId: userList.ownerId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
          })
          .from(userList)
          .leftJoin(appUser, eq(userList.ownerId, appUser.id))
          .where(
            and(
              inArray(userList.ownerId, authorIds),
              inArray(userList.audience, ["followers", "public"]),
              eq(userList.kind, "standard"),
              // Una lista oculta por moderación no se anuncia (expand-feed-coverage).
              eq(userList.moderationStatus, "visible"),
              BLOCKED_SQL(viewerId, userList.ownerId),
              ...(searchPattern ? [ilike(userList.title, searchPattern)] : []),
            ),
          )
          .orderBy(desc(userList.createdAt), desc(userList.id))
          .limit(perSource)
      : Promise.resolve([]),

    // rating/comment no tienen columna de audiencia propia: se tratan como
    // audiencia "public" implícita, ya cubierta por pertenecer a followedIds
    // (relación aceptada) — ver design.md de add-ratings-comments-feed.
    includeKind("rating")
      ? db
          .select({
            id: rating.id,
            stars: rating.stars,
            detailedScore: rating.detailedScore,
            updatedAt: rating.updatedAt,
            artistId: rating.artistId,
            releaseGroupId: rating.releaseGroupId,
            recordingId: rating.recordingId,
            artistName: artist.name,
            creditedArtist: PRIMARY_ARTIST_SQL(rating.releaseGroupId, rating.recordingId),
            creditedArtistId: PRIMARY_ARTIST_ID_SQL(rating.releaseGroupId, rating.recordingId),
            recordingAlbumId: RECORDING_ALBUM_ID_SQL(rating.recordingId),
            recordingAlbumTitle: RECORDING_ALBUM_TITLE_SQL(rating.recordingId),
            releaseTitle: releaseGroup.title,
            releaseCover: releaseGroup.coverThumbUrl,
            recordingTitle: recording.title,
            authorId: rating.userId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
          })
          .from(rating)
          .leftJoin(artist, eq(rating.artistId, artist.id))
          .leftJoin(releaseGroup, eq(rating.releaseGroupId, releaseGroup.id))
          .leftJoin(recording, eq(rating.recordingId, recording.id))
          .leftJoin(appUser, eq(rating.userId, appUser.id))
          .where(
            and(
              inArray(rating.userId, authorIds),
              BLOCKED_SQL(viewerId, rating.userId),
              ...titleSearchCondition(searchPattern, rating.releaseGroupId, rating.recordingId),
            ),
          )
          .orderBy(desc(rating.updatedAt), desc(rating.id))
          .limit(perSource)
      : Promise.resolve([]),

    includeKind("comment")
      ? db
          .select({
            id: comment.id,
            body: comment.body,
            topic: comment.topic,
            createdAt: comment.createdAt,
            artistId: comment.artistId,
            releaseGroupId: comment.releaseGroupId,
            recordingId: comment.recordingId,
            artistName: artist.name,
            creditedArtist: PRIMARY_ARTIST_SQL(comment.releaseGroupId, comment.recordingId),
            creditedArtistId: PRIMARY_ARTIST_ID_SQL(comment.releaseGroupId, comment.recordingId),
            releaseTitle: releaseGroup.title,
            releaseCover: releaseGroup.coverThumbUrl,
            recordingTitle: recording.title,
            authorId: comment.userId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
          })
          .from(comment)
          .leftJoin(artist, eq(comment.artistId, artist.id))
          .leftJoin(releaseGroup, eq(comment.releaseGroupId, releaseGroup.id))
          .leftJoin(recording, eq(comment.recordingId, recording.id))
          .leftJoin(appUser, eq(comment.userId, appUser.id))
          .where(
            and(
              rootCommentsOnly(),
              inArray(comment.userId, authorIds),
              BLOCKED_SQL(viewerId, comment.userId),
              ...titleSearchCondition(searchPattern, comment.releaseGroupId, comment.recordingId),
            ),
          )
          .orderBy(desc(comment.createdAt), desc(comment.id))
          .limit(perSource)
      : Promise.resolve([]),

    includeKind("review")
      ? db
          .select({
            id: review.id,
            title: review.title,
            body: review.body,
            updatedAt: review.updatedAt,
            artistId: review.artistId,
            releaseGroupId: review.releaseGroupId,
            recordingId: review.recordingId,
            artistName: artist.name,
            creditedArtist: PRIMARY_ARTIST_SQL(review.releaseGroupId, review.recordingId),
            creditedArtistId: PRIMARY_ARTIST_ID_SQL(review.releaseGroupId, review.recordingId),
            releaseTitle: releaseGroup.title,
            releaseCover: releaseGroup.coverThumbUrl,
            recordingTitle: recording.title,
            authorId: review.userId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
          })
          .from(review)
          .leftJoin(artist, eq(review.artistId, artist.id))
          .leftJoin(releaseGroup, eq(review.releaseGroupId, releaseGroup.id))
          .leftJoin(recording, eq(review.recordingId, recording.id))
          .leftJoin(appUser, eq(review.userId, appUser.id))
          .where(
            and(
              inArray(review.userId, authorIds),
              BLOCKED_SQL(viewerId, review.userId),
              ...titleSearchCondition(searchPattern, review.releaseGroupId, review.recordingId),
            ),
          )
          .orderBy(desc(review.updatedAt), desc(review.id))
          .limit(perSource)
      : Promise.resolve([]),

    // Visible para el lector cuando el objetivo del seguimiento tiene perfil
    // público, o el lector ya lo sigue con relación aceptada (está en
    // `followedIds`) — misma regla que usaba `feed-ambient-events` para este
    // mismo evento, ahora movida acá (openspec: add-feed-kind-differentiation).
    // Nunca el propio lector como objetivo; nunca con bloqueo en cualquier
    // dirección entre lector y autor, o lector y objetivo.
    includeFollow
      ? db
          .select({
            id: userFollow.id,
            createdAt: userFollow.updatedAt,
            authorId: userFollow.followerId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
            followedId: userFollow.followedId,
            followedUsername: followedUser.username,
            followedDisplayName: followedUser.displayName,
          })
          .from(userFollow)
          .leftJoin(appUser, eq(appUser.id, userFollow.followerId))
          .leftJoin(followedUser, eq(followedUser.id, userFollow.followedId))
          .where(
            and(
              inArray(userFollow.followerId, authorIds),
              eq(userFollow.status, "accepted"),
              activeUserCondition(followedUser),
              ne(followedUser.id, viewerId),
              or(eq(followedUser.profileVisibility, "public"), inArray(followedUser.id, followedIds)),
              BLOCKED_SQL(viewerId, userFollow.followerId),
              BLOCKED_SQL(viewerId, followedUser.id),
            ),
          )
          .orderBy(desc(userFollow.updatedAt), desc(userFollow.id))
          .limit(perSource)
      : Promise.resolve([]),

    // Sin regla de visibilidad adicional: un artista no tiene perfil privado,
    // a diferencia del objetivo de "seguir a un usuario" (openspec:
    // add-artist-follow-feed-entry). Solo se excluye por bloqueo autor↔lector.
    includeFollowArtist
      ? db
          .select({
            id: artistFollow.id,
            createdAt: artistFollow.createdAt,
            authorId: artistFollow.userId,
            authorUsername: appUser.username,
            authorDisplayName: appUser.displayName,
            artistId: artistFollow.artistId,
            artistName: artist.name,
          })
          .from(artistFollow)
          .leftJoin(appUser, eq(appUser.id, artistFollow.userId))
          .leftJoin(artist, eq(artist.id, artistFollow.artistId))
          .where(and(inArray(artistFollow.userId, authorIds), BLOCKED_SQL(viewerId, artistFollow.userId)))
          .orderBy(desc(artistFollow.createdAt), desc(artistFollow.id))
          .limit(perSource)
      : Promise.resolve([]),

    // Altas en la colección física y en la wishlist y Caminos (openspec:
    // expand-feed-coverage). Fuentes compartidas con el rastro propio de Inicio
    // (`listMyRecentActivity`), que pasa sus propias condiciones.
    includeKind("collection")
      ? collectionFeedQuery(
          and(
            inArray(collectionEntry.userId, authorIds),
            inArray(collectionEntry.audience, ["followers", "public"]),
            BLOCKED_SQL(viewerId, collectionEntry.userId),
            ...albumSearchCondition(searchPattern, collectionEntry.releaseGroupId),
          ),
          perSource,
        )
      : Promise.resolve([]),

    includeKind("wanted")
      ? wantedFeedQuery(
          and(
            inArray(wantedEntry.userId, authorIds),
            inArray(wantedEntry.audience, ["followers", "public"]),
            BLOCKED_SQL(viewerId, wantedEntry.userId),
            ...albumSearchCondition(searchPattern, wantedEntry.releaseGroupId),
          ),
          perSource,
        )
      : Promise.resolve([]),

    includeKind("camino")
      ? caminoCreatedFeedQuery(
          and(
            ...caminoBaseConditions(authorIds),
            inArray(userList.audience, ["followers", "public"]),
            BLOCKED_SQL(viewerId, userList.ownerId),
            ...(searchPattern ? [ilike(userList.title, searchPattern)] : []),
          ),
          perSource,
        )
      : Promise.resolve([]),

    includeKind("camino")
      ? caminoCompletedFeedQuery(
          and(
            ...caminoBaseConditions(authorIds),
            inArray(userList.audience, ["followers", "public"]),
            BLOCKED_SQL(viewerId, userList.ownerId),
            ...(searchPattern ? [ilike(userList.title, searchPattern)] : []),
          ),
          perSource,
        )
      : Promise.resolve([]),
  ]);

  const author = (id: string, username: string | null, displayName: string | null): FeedAuthor => ({
    id,
    username: username ?? "",
    displayName,
  });

  const listenEntries: FeedEntry[] = listens.map((row) => {
    const type: "artist" | "release-group" | "recording" = row.artistId
      ? "artist"
      : row.releaseGroupId
        ? "release-group"
        : "recording";
    return {
      kind: "listen",
      id: row.id,
      listenContext: row.listenContext as FeedListenEntry["listenContext"],
      body: row.body,
      reaction: row.reaction as FeedListenEntry["reaction"],
      audience: row.audience as Audience,
      createdAt: row.createdAt.toISOString(),
      target: {
        type,
        id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
        title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
        subtitle: null,
        artistName: row.creditedArtist,
        artistId: row.creditedArtistId,
        albumId: row.recordingAlbumId,
        albumTitle: row.recordingAlbumTitle,
        coverThumbUrl: row.releaseCover,
      },
      author: author(row.authorId, row.authorUsername, row.authorDisplayName),
    };
  });

  const favoriteEntries: FeedEntry[] = favorites.map((row) => {
    const targetType =
      row.artistId ? "artist" : row.releaseGroupId ? "release-group" : "recording";
    return {
      kind: "favorite" as const,
      id: row.id,
      targetType,
      audience: row.audience as Audience,
      createdAt: row.createdAt.toISOString(),
      target: {
        id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
        title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
        artistName: row.creditedArtist,
        artistId: row.creditedArtistId,
        albumId: row.recordingAlbumId,
        albumTitle: row.recordingAlbumTitle,
        coverThumbUrl: row.releaseCover,
      },
      author: author(row.authorId, row.authorUsername, row.authorDisplayName),
    };
  });

  const listEntries: FeedEntry[] = lists.map((row) => ({
    kind: "list",
    id: row.id,
    event: row.updatedAt > row.createdAt ? "updated" : "created",
    audience: row.audience as Audience,
    createdAt: row.updatedAt.toISOString(),
    list: {
      id: row.id,
      title: row.title,
      entityType: row.entityType as "artist" | "release-group" | "recording",
    },
    author: author(row.authorId, row.authorUsername, row.authorDisplayName),
  }));

  const ratingEntries: FeedEntry[] = ratings.map((row) => {
    const type: "artist" | "release-group" | "recording" = row.artistId
      ? "artist"
      : row.releaseGroupId
        ? "release-group"
        : "recording";
    return {
      kind: "rating" as const,
      id: row.id,
      stars: row.stars,
      detailedScore: row.detailedScore,
      createdAt: row.updatedAt.toISOString(),
      target: {
        type,
        id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
        title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
        artistName: row.creditedArtist,
        artistId: row.creditedArtistId,
        albumId: row.recordingAlbumId,
        albumTitle: row.recordingAlbumTitle,
        coverThumbUrl: row.releaseCover,
      },
      author: author(row.authorId, row.authorUsername, row.authorDisplayName),
    };
  });

  const commentEntries: FeedEntry[] = comments.map((row) => {
    const type: "artist" | "release-group" | "recording" = row.artistId
      ? "artist"
      : row.releaseGroupId
        ? "release-group"
        : "recording";
    return {
      kind: "comment" as const,
      id: row.id,
      body: row.body,
      topic: row.topic,
      createdAt: row.createdAt.toISOString(),
      target: {
        type,
        id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
        title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
        artistName: row.creditedArtist,
        artistId: row.creditedArtistId,
        coverThumbUrl: row.releaseCover,
      },
      author: author(row.authorId, row.authorUsername, row.authorDisplayName),
    };
  });

  const reviewEntries: FeedEntry[] = reviews.map((row) => {
    const type: "artist" | "release-group" | "recording" = row.artistId
      ? "artist"
      : row.releaseGroupId
        ? "release-group"
        : "recording";
    return {
      kind: "review" as const,
      id: row.id,
      title: row.title,
      body: row.body,
      createdAt: row.updatedAt.toISOString(),
      target: {
        type,
        id: row.artistId ?? row.releaseGroupId ?? row.recordingId ?? "",
        title: row.artistName ?? row.releaseTitle ?? row.recordingTitle ?? "",
        artistName: row.creditedArtist,
        artistId: row.creditedArtistId,
        coverThumbUrl: row.releaseCover,
      },
      author: author(row.authorId, row.authorUsername, row.authorDisplayName),
    };
  });

  const followEntries: FeedEntry[] = follows.map((row) => ({
    kind: "follow" as const,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    followedUser: author(row.followedId, row.followedUsername, row.followedDisplayName),
    author: author(row.authorId, row.authorUsername, row.authorDisplayName),
  }));

  const followArtistEntries: FeedEntry[] = followArtists.map((row) => ({
    kind: "follow-artist" as const,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    artist: { id: row.artistId, name: row.artistName ?? "" },
    author: author(row.authorId, row.authorUsername, row.authorDisplayName),
  }));

  const collectionEntries: FeedEntry[] = collections.map(collectionFeedEntry);
  const wantedEntries: FeedEntry[] = wanteds.map(wantedFeedEntry);
  const caminoEntries: FeedEntry[] = caminoFeedEntries(caminosCreated, caminosCompleted);

  const merged = [
    ...listenEntries,
    ...favoriteEntries,
    ...listEntries,
    ...ratingEntries,
    ...commentEntries,
    ...reviewEntries,
    ...followEntries,
    ...followArtistEntries,
    ...collectionEntries,
    ...wantedEntries,
    ...caminoEntries,
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice((page - 1) * pageSize, page * pageSize + extra);

  const entries = merged.slice(0, pageSize);
  await attachAuthorAvatars(entries);

  return {
    entries,
    page,
    pageSize,
    hasNext: merged.length > pageSize,
  };
}