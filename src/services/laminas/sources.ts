// Fuentes de una Lámina (openspec: add-top-n-lamina-phase2, docs/05-features/sharing.md §4.2): las valoraciones, los
// favoritos o una lista propia sugieren candidatos que la persona confirma. Una fuente copia ítems una sola vez y sus
// filtros no se guardan: el Top N sigue siendo de autor. Todo lo que se lee aquí es de la propia persona, también sus
// notas y sus escuchas privadas: lo que protege esos datos es que la Lámina nazca privada (`createLamina`).

import { and, asc, desc, eq, isNotNull, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { favorite, rating, recording, releaseGroup, userList, userListItem } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { scheduleCoverMirrorsForUrls } from "@/services/catalog/cover-mirror";
import { PRIMARY_ARTIST_SQL, RECORDING_COVER_SQL } from "@/services/feed/feed";
import { albumInGenreTreeOnce, findStyleGenreBySlug, recordingsInGenreTree } from "@/services/genres/read";
import { RECORDING_YEAR_SQL } from "@/services/ratings/my-ratings";
import type { LaminaEntityType, LaminaScore } from "./laminas";

export const LAMINA_SOURCES = ["ratings", "favorites", "list"] as const;
export type LaminaSource = (typeof LAMINA_SOURCES)[number];

export const LAMINA_CANDIDATE_LIMIT = 30;
/** Tope de candidatos que se puede pedir: la tier list ve hasta 50 (openspec: add-tier-list-lamina-phase2). */
export const LAMINA_CANDIDATE_MAX = 50;
const GENRE_OPTIONS_LIMIT = 20;
const ARTIST_OPTIONS_LIMIT = 200;

export interface LaminaSourceFilters {
  year?: number;
  decade?: number;
  listenYear?: number;
  genre?: string;
  artist?: string;
}

export interface LaminaCandidateQuery extends LaminaSourceFilters {
  source: LaminaSource;
  entityType: LaminaEntityType;
  list?: string;
  timeZone?: string;
  /** Cuántos candidatos, de 1 a `LAMINA_CANDIDATE_MAX`; por defecto `LAMINA_CANDIDATE_LIMIT`. */
  limit?: number;
}

export interface LaminaCandidate {
  target: { id: string; title: string; artistName: string | null; coverThumbUrl: string | null };
  score: LaminaScore | null;
}

export interface LaminaSourceOptions {
  years: number[];
  decades: number[];
  listenYears: number[];
  genres: { slug: string; name: string; nameEs: string | null; itemCount: number }[];
  artists: { id: string; name: string; itemCount: number }[];
  lists: { id: string; title: string; itemCount: number }[];
}

function invalid(message: string): ApiError {
  return new ApiError("VALIDATION_ERROR", 400, message);
}

function assertQuery(query: LaminaCandidateQuery): void {
  if (query.year !== undefined && query.decade !== undefined) throw invalid("El año y la década no se combinan");
  if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > LAMINA_CANDIDATE_MAX)) {
    throw invalid(`Se piden de 1 a ${LAMINA_CANDIDATE_MAX} candidatos`);
  }
  if (query.decade !== undefined && query.decade % 10 !== 0) throw invalid("La década no es válida");
  const filtered = [query.year, query.decade, query.listenYear, query.genre, query.artist].some((value) => value !== undefined);
  if (query.source === "list") {
    if (!query.list) throw invalid("Falta la lista");
    if (filtered) throw invalid("Una lista no se filtra");
  } else if (query.list) {
    throw invalid("La lista solo aplica a esa fuente");
  }
}

/** Condiciones de los filtros sobre el objetivo; `null` si el género no existe, que es una selección vacía. */
async function filterConditions(
  userId: string,
  query: LaminaCandidateQuery & { source: "ratings" | "favorites" },
  target: AnyColumn,
): Promise<SQL[] | null> {
  const songs = query.entityType === "recording";
  const conditions: SQL[] = [];
  const year = songs ? RECORDING_YEAR_SQL(target) : sql`${releaseGroup.firstReleaseYear}`;

  if (query.year !== undefined) conditions.push(sql`${year} = ${query.year}`);
  if (query.decade !== undefined) conditions.push(sql`${year} BETWEEN ${query.decade} AND ${query.decade + 9}`);

  if (query.listenYear !== undefined) {
    // El diario registra objetivos: una escucha de una canción no cuenta para su álbum.
    const column = sql.raw(songs ? "recording_id" : "release_group_id");
    const timeZone = query.timeZone ?? "UTC";
    conditions.push(sql`EXISTS (
      SELECT 1 FROM listen_entry le
      WHERE le.user_id = ${userId}::uuid
        AND le.${column} = ${target}
        AND le.created_at >= make_timestamptz(${query.listenYear}::int, 1, 1, 0, 0, 0, ${timeZone}::text)
        AND le.created_at < make_timestamptz(${query.listenYear + 1}::int, 1, 1, 0, 0, 0, ${timeZone}::text)
    )`);
  }

  if (query.genre !== undefined) {
    const found = await findStyleGenreBySlug(query.genre);
    if (!found) return null;
    if (songs) {
      // Como JSON y no como lista de parámetros: quien valora mucho puede pasar el límite de parámetros de una consulta.
      const matching = await recordingsInGenreTree(found.id, sourceTargets(userId, query.source, query.entityType));
      conditions.push(sql`${target} IN (SELECT value::uuid FROM json_array_elements_text(${JSON.stringify(matching)}::json))`);
    } else {
      conditions.push(albumInGenreTreeOnce(found.id));
    }
  }

  if (query.artist !== undefined) {
    const column = sql.raw(songs ? "recording_id" : "release_group_id");
    conditions.push(sql`EXISTS (
      SELECT 1 FROM credit c
      WHERE c.role = 'primary' AND c.artist_id = ${query.artist}::uuid AND c.${column} = ${target}
    )`);
  }
  return conditions;
}

/** Campos comunes de un candidato: los tres orígenes dejan unidos `release_group`, `recording` y `rating`. */
function candidateFields(entityType: LaminaEntityType, releaseGroupId: AnyColumn, recordingId: AnyColumn) {
  const songs = entityType === "recording";
  return {
    id: sql<string>`${songs ? recordingId : releaseGroupId}`,
    title: sql<string>`${songs ? recording.title : releaseGroup.title}`,
    cover: songs ? RECORDING_COVER_SQL(recordingId) : sql<string | null>`${releaseGroup.coverThumbUrl}`,
    artistName: PRIMARY_ARTIST_SQL(releaseGroupId, recordingId),
    stars: rating.stars,
    detailedScore: rating.detailedScore,
  };
}

type CandidateRow = {
  id: string;
  title: string;
  cover: string | null;
  artistName: string | null;
  stars: string | null;
  detailedScore: number | null;
};

const STARS_DESC = sql`(${rating.stars})::float DESC NULLS LAST`;
const DETAILED_DESC = sql`${rating.detailedScore} DESC NULLS LAST`;

async function fromRatings(userId: string, query: LaminaCandidateQuery): Promise<CandidateRow[]> {
  const songs = query.entityType === "recording";
  const target = songs ? rating.recordingId : rating.releaseGroupId;
  const filters = await filterConditions(userId, { ...query, source: "ratings" }, target);
  if (!filters) return [];
  return db
    .select(candidateFields(query.entityType, rating.releaseGroupId, rating.recordingId))
    .from(rating)
    .leftJoin(releaseGroup, eq(rating.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(rating.recordingId, recording.id))
    .where(and(eq(rating.userId, userId), isNotNull(target), ...filters))
    .orderBy(STARS_DESC, DETAILED_DESC, desc(rating.updatedAt), asc(rating.id))
    .limit(query.limit ?? LAMINA_CANDIDATE_LIMIT);
}

async function fromFavorites(userId: string, query: LaminaCandidateQuery): Promise<CandidateRow[]> {
  const songs = query.entityType === "recording";
  const target = songs ? favorite.recordingId : favorite.releaseGroupId;
  const filters = await filterConditions(userId, { ...query, source: "favorites" }, target);
  if (!filters) return [];
  // Un favorito no tiene rango propio: primero la nota, si la hay, y después lo más reciente.
  return db
    .select(candidateFields(query.entityType, favorite.releaseGroupId, favorite.recordingId))
    .from(favorite)
    .leftJoin(releaseGroup, eq(favorite.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(favorite.recordingId, recording.id))
    .leftJoin(rating, and(eq(rating.userId, favorite.userId), eq(songs ? rating.recordingId : rating.releaseGroupId, target)))
    .where(and(eq(favorite.userId, userId), isNotNull(target), ...filters))
    .orderBy(STARS_DESC, DETAILED_DESC, desc(favorite.createdAt), desc(favorite.id))
    .limit(query.limit ?? LAMINA_CANDIDATE_LIMIT);
}

async function fromList(userId: string, query: LaminaCandidateQuery): Promise<CandidateRow[]> {
  const listId = query.list as string;
  const [list] = await db
    .select({ entityType: userList.entityType })
    .from(userList)
    .where(and(eq(userList.id, listId), eq(userList.ownerId, userId), eq(userList.kind, "standard")))
    .limit(1);
  if (!list) throw new ApiError("LIST_NOT_FOUND", 404, "La lista no existe");
  if (list.entityType !== query.entityType) throw invalid("La lista es de otro tipo");

  const songs = query.entityType === "recording";
  const target = songs ? userListItem.recordingId : userListItem.releaseGroupId;
  return db
    .select(candidateFields(query.entityType, userListItem.releaseGroupId, userListItem.recordingId))
    .from(userListItem)
    .leftJoin(releaseGroup, eq(userListItem.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(userListItem.recordingId, recording.id))
    .leftJoin(rating, and(eq(rating.userId, userId), eq(songs ? rating.recordingId : rating.releaseGroupId, target)))
    .where(and(eq(userListItem.listId, listId), isNotNull(target)))
    .orderBy(asc(userListItem.position), asc(userListItem.id))
    .limit(query.limit ?? LAMINA_CANDIDATE_LIMIT);
}

/** Candidatos en el orden en que entrarían a la Lámina, hasta `LAMINA_CANDIDATE_LIMIT`. */
export async function listLaminaCandidates(userId: string, query: LaminaCandidateQuery): Promise<LaminaCandidate[]> {
  assertQuery(query);
  const rows =
    query.source === "ratings"
      ? await fromRatings(userId, query)
      : query.source === "favorites"
        ? await fromFavorites(userId, query)
        : await fromList(userId, query);
  scheduleCoverMirrorsForUrls(rows.map((row) => row.cover));
  return rows.map((row) => ({
    target: { id: row.id, title: row.title, artistName: row.artistName, coverThumbUrl: row.cover },
    score: row.stars === null ? null : { stars: row.stars, detailedScore: row.detailedScore },
  }));
}

/** Objetivos de la fuente. Tabla y columna salen de valores fijos, nunca de la entrada. */
function sourceTargets(userId: string, source: "ratings" | "favorites", entityType: LaminaEntityType): SQL {
  const table = sql.raw(source === "ratings" ? "rating" : "favorite");
  const column = sql.raw(entityType === "recording" ? "recording_id" : "release_group_id");
  return sql`SELECT ${column} FROM ${table} WHERE user_id = ${userId}::uuid AND ${column} IS NOT NULL`;
}

async function yearOptions(targets: SQL, entityType: LaminaEntityType): Promise<number[]> {
  const rows = await db.execute<{ year: number }>(
    entityType === "recording"
      ? sql`
        SELECT DISTINCT y.year FROM (
          SELECT min(rg.first_release_year)::int AS year
          FROM track t
          JOIN release r ON r.id = t.release_id
          JOIN release_group rg ON rg.id = r.release_group_id
          WHERE t.recording_id IN (${targets}) AND rg.first_release_year IS NOT NULL
          GROUP BY t.recording_id
        ) y
        ORDER BY y.year DESC`
      : sql`
        SELECT DISTINCT rg.first_release_year::int AS year
        FROM release_group rg
        WHERE rg.id IN (${targets}) AND rg.first_release_year IS NOT NULL
        ORDER BY year DESC`,
  );
  return rows.map((row) => Number(row.year));
}

async function listenYearOptions(userId: string, targets: SQL, entityType: LaminaEntityType, timeZone: string): Promise<number[]> {
  const column = sql.raw(entityType === "recording" ? "recording_id" : "release_group_id");
  const rows = await db.execute<{ year: number }>(sql`
    SELECT DISTINCT extract(year FROM le.created_at AT TIME ZONE ${timeZone}::text)::int AS year
    FROM listen_entry le
    WHERE le.user_id = ${userId}::uuid AND le.${column} IN (${targets})
    ORDER BY year DESC`);
  return rows.map((row) => Number(row.year));
}

/** Géneros de la fuente con sus ancestros: quien tiene Thrash Metal también puede pedir Metal. */
async function genreOptions(targets: SQL, entityType: LaminaEntityType): Promise<LaminaSourceOptions["genres"]> {
  const albums =
    entityType === "recording"
      ? sql`
        SELECT DISTINCT t.recording_id AS target_id, r.release_group_id
        FROM track t JOIN release r ON r.id = t.release_id
        WHERE t.recording_id IN (${targets})`
      : sql`SELECT rg.id AS target_id, rg.id AS release_group_id FROM release_group rg WHERE rg.id IN (${targets})`;
  const rows = await db.execute<{ slug: string; name: string; name_es: string | null; item_count: number }>(sql`
    WITH RECURSIVE items AS MATERIALIZED (${albums}),
    up(target_id, genre_id) AS (
      SELECT i.target_id, e.genre_id
      FROM items i
      JOIN release_group_effective_genre e ON e.release_group_id = i.release_group_id
      UNION
      SELECT u.target_id, r.related_genre_id
      FROM up u
      JOIN genre_relation r ON r.genre_id = u.genre_id AND r.kind = 'subgenre_of'
    )
    SELECT g.slug, g.name, g.name_es, count(DISTINCT u.target_id)::int AS item_count
    FROM up u
    JOIN genre g ON g.id = u.genre_id
    WHERE g.kind = 'style'
    GROUP BY g.id
    ORDER BY item_count DESC, g.name
    LIMIT ${GENRE_OPTIONS_LIMIT}`);
  return rows.map((row) => ({ slug: row.slug, name: row.name, nameEs: row.name_es, itemCount: Number(row.item_count) }));
}

async function artistOptions(targets: SQL, entityType: LaminaEntityType): Promise<LaminaSourceOptions["artists"]> {
  const column = sql.raw(entityType === "recording" ? "recording_id" : "release_group_id");
  const rows = await db.execute<{ id: string; name: string; item_count: number }>(sql`
    SELECT a.id, a.name, count(DISTINCT c.${column})::int AS item_count
    FROM credit c
    JOIN artist a ON a.id = c.artist_id
    WHERE c.role = 'primary' AND c.${column} IN (${targets})
    GROUP BY a.id
    ORDER BY item_count DESC, a.name
    LIMIT ${ARTIST_OPTIONS_LIMIT}`);
  return rows.map((row) => ({ id: row.id, name: row.name, itemCount: Number(row.item_count) }));
}

async function listOptions(userId: string, entityType: LaminaEntityType): Promise<LaminaSourceOptions["lists"]> {
  return db
    .select({ id: userList.id, title: userList.title, itemCount: sql<number>`count(${userListItem.id})::int` })
    .from(userList)
    .innerJoin(userListItem, eq(userListItem.listId, userList.id))
    .where(and(eq(userList.ownerId, userId), eq(userList.kind, "standard"), eq(userList.entityType, entityType)))
    .groupBy(userList.id)
    .orderBy(desc(userList.updatedAt), desc(userList.id));
}

/** Lo que la fuente puede ofrecer, sin cruzar los filtros entre sí. */
export async function listLaminaSourceOptions(
  userId: string,
  { source, entityType, timeZone = "UTC" }: { source: LaminaSource; entityType: LaminaEntityType; timeZone?: string },
): Promise<LaminaSourceOptions> {
  if (source === "list") {
    return { years: [], decades: [], listenYears: [], genres: [], artists: [], lists: await listOptions(userId, entityType) };
  }
  const targets = sourceTargets(userId, source, entityType);
  const [years, listenYears, genres, artists] = await Promise.all([
    yearOptions(targets, entityType),
    listenYearOptions(userId, targets, entityType, timeZone),
    genreOptions(targets, entityType),
    artistOptions(targets, entityType),
  ]);
  const decades = [...new Set(years.map((year) => Math.floor(year / 10) * 10))];
  return { years, decades, listenYears, genres, artists, lists: [] };
}
