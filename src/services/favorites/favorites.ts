import { and, asc, desc, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { artist, favorite, recording, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience } from "@/services/social/types";
import { FAVORITE_TARGET_TYPES } from "./types";
import type { FavoriteTargetType, FavoriteTarget } from "./types";

export type { FavoriteTarget } from "./types";

type TargetColumn = "artistId" | "releaseGroupId" | "recordingId";

export const FAVORITE_SORTS = ["recent", "alpha"] as const;
export type FavoriteSort = (typeof FAVORITE_SORTS)[number];

const AUDIENCES: Audience[] = ["private", "followers", "public"];

export interface FavoriteFilters {
  q?: string;
  type?: FavoriteTargetType;
  audience?: Audience;
  sort?: FavoriteSort;
}

export interface FavoriteCounts {
  artist: number;
  "release-group": number;
  recording: number;
}

// Título del objetivo, resuelto desde la tabla que corresponda (los otros
// dos joins quedan en null). Se usa para el buscador `q` y el orden alfabético.
const TITLE_EXPR = sql`coalesce(${artist.name}, ${releaseGroup.title}, ${recording.title})`;

// Rango fijo de tipo para que el muro agrupe artistas → álbumes → canciones.
const TYPE_RANK_EXPR = sql`case
  when ${favorite.artistId} is not null then 0
  when ${favorite.releaseGroupId} is not null then 1
  else 2 end`;

function normalizeFavoriteFilters(filters?: FavoriteFilters) {
  const sort: FavoriteSort = filters?.sort ?? "recent";
  if (!FAVORITE_SORTS.includes(sort)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
  }
  if (filters?.type && !FAVORITE_TARGET_TYPES.includes(filters.type)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El tipo de contenido no es válido");
  }
  if (filters?.audience && !AUDIENCES.includes(filters.audience)) {
    throw new ApiError("VALIDATION_ERROR", 400, "La audiencia no es válida");
  }
  const q = filters?.q?.trim();
  return { q: q ? q : undefined, type: filters?.type, audience: filters?.audience, sort };
}

export interface FavoriteEntry {
  id: string;
  targetType: FavoriteTargetType;
  audience: Audience;
  createdAt: string;
  target: {
    id: string;
    title: string;
    coverThumbUrl: string | null;
  };
}

function targetValues(type: FavoriteTargetType, id: string) {
  return {
    artistId: type === "artist" ? id : null,
    releaseGroupId: type === "release-group" ? id : null,
    recordingId: type === "recording" ? id : null,
  };
}

function targetTypeFromColumns(
  artistId: string | null,
  releaseGroupId: string | null,
  recordingId: string | null,
): FavoriteTargetType {
  if (artistId) return "artist";
  if (releaseGroupId) return "release-group";
  // La invariante CHECK num_nonnulls = 1 garantiza que recordingId es la
  // única alternativa restante; si no, es un favorito corrupto.
  if (recordingId) return "recording";
  throw new ApiError("INTERNAL_ERROR", 500, "Favorito sin objetivo válido");
}

/** Resuelve y valida que el objetivo exista. */
export async function resolveFavoriteTarget(type: FavoriteTargetType, id: string): Promise<FavoriteTarget> {
  let found = false;
  if (type === "artist") {
    const [row] = await db.select({ id: artist.id }).from(artist).where(eq(artist.id, id)).limit(1);
    found = !!row;
  } else if (type === "release-group") {
    const [row] = await db.select({ id: releaseGroup.id }).from(releaseGroup).where(eq(releaseGroup.id, id)).limit(1);
    found = !!row;
  } else {
    const [row] = await db.select({ id: recording.id }).from(recording).where(eq(recording.id, id)).limit(1);
    found = !!row;
  }
  if (!found) throw new ApiError("FAVORITE_TARGET_INVALID", 404, "El objetivo del favorito no existe");
  return { type, id };
}

/**
 * Toggle idempotente de favorito.
 * Si el favorito ya existe lo elimina (retorna null).
 * Si no existe lo crea.
 * Ambas operaciones son idempotentes.
 */
export async function toggleFavorite(
  target: FavoriteTarget,
  userId: string,
  audience: Audience = "followers",
): Promise<FavoriteEntry | null> {
  // Validar que el objetivo exista antes de intentar crear el favorito.
  await resolveFavoriteTarget(target.type, target.id);

  const [existing] = await db
    .select()
    .from(favorite)
    .where(
      and(
        eq(favorite.userId, userId),
        ...Object.entries(targetValues(target.type, target.id))
          .filter(([, v]) => v !== null)
          .map(([k, v]) => eq(favorite[k as TargetColumn], v as string)),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(favorite).where(eq(favorite.id, existing.id));
    return null;
  }

  const [created] = await db
    .insert(favorite)
    .values({ ...targetValues(target.type, target.id), userId, audience })
    .returning();

  if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear el favorito");
  return getOwnedFavorite(created.id, userId);
}

/** Actualiza la audiencia de un favorito propio. */
export async function updateFavoriteAudience(
  favoriteId: string,
  userId: string,
  audience: Audience,
): Promise<FavoriteEntry> {
  const [updated] = await db
    .update(favorite)
    .set({ audience })
    .where(and(eq(favorite.id, favoriteId), eq(favorite.userId, userId)))
    .returning();

  if (!updated) throw new ApiError("FAVORITE_NOT_FOUND", 404, "El favorito no existe");
  return getOwnedFavorite(updated.id, userId);
}

/**
 * Cambia la audiencia de varios favoritos propios a la vez.
 * Idempotente; los ids ajenos o inexistentes del conjunto se ignoran. Si ningún
 * id corresponde a un favorito del usuario, lanza `FAVORITE_NOT_FOUND`.
 * Devuelve los ids efectivamente actualizados.
 */
export async function updateFavoritesAudienceBulk(
  favoriteIds: string[],
  userId: string,
  audience: Audience,
): Promise<string[]> {
  if (favoriteIds.length === 0 || favoriteIds.length > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La selección de favoritos no es válida");
  }

  const updated = await db
    .update(favorite)
    .set({ audience })
    .where(and(inArray(favorite.id, favoriteIds), eq(favorite.userId, userId)))
    .returning({ id: favorite.id });

  if (updated.length === 0) {
    throw new ApiError("FAVORITE_NOT_FOUND", 404, "Ningún favorito de la selección es tuyo");
  }
  return updated.map((row) => row.id);
}

/** Elimina un favorito propio de forma idempotente. */
export async function removeFavorite(target: FavoriteTarget, userId: string): Promise<void> {
  await db
    .delete(favorite)
    .where(
      and(
        eq(favorite.userId, userId),
        ...Object.entries(targetValues(target.type, target.id))
          .filter(([, v]) => v !== null)
          .map(([k, v]) => eq(favorite[k as TargetColumn], v as string)),
      ),
    );
}

const FAVORITE_ROW_SELECT = {
  id: favorite.id,
  audience: favorite.audience,
  createdAt: favorite.createdAt,
  artistId: favorite.artistId,
  releaseGroupId: favorite.releaseGroupId,
  recordingId: favorite.recordingId,
  artistName: artist.name,
  releaseTitle: releaseGroup.title,
  releaseCover: releaseGroup.coverThumbUrl,
  recordingTitle: recording.title,
} as const;

function favoritesFrom() {
  return db
    .select(FAVORITE_ROW_SELECT)
    .from(favorite)
    .leftJoin(artist, eq(favorite.artistId, artist.id))
    .leftJoin(releaseGroup, eq(favorite.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(favorite.recordingId, recording.id));
}

// Conteo por tipo sobre el conjunto que cumple `scopeConditions` (userId + los
// filtros `q`/`audience`, nunca el filtro `type`), para el encabezado-retrato.
async function favoriteCounts(scopeConditions: SQL[]): Promise<FavoriteCounts> {
  const [row] = await db
    .select({
      artist: sql<number>`count(*) filter (where ${favorite.artistId} is not null)`.mapWith(Number),
      releaseGroup:
        sql<number>`count(*) filter (where ${favorite.releaseGroupId} is not null)`.mapWith(Number),
      recording:
        sql<number>`count(*) filter (where ${favorite.recordingId} is not null)`.mapWith(Number),
    })
    .from(favorite)
    .leftJoin(artist, eq(favorite.artistId, artist.id))
    .leftJoin(releaseGroup, eq(favorite.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(favorite.recordingId, recording.id))
    .where(and(...scopeConditions));

  return {
    artist: row?.artist ?? 0,
    "release-group": row?.releaseGroup ?? 0,
    recording: row?.recording ?? 0,
  };
}

function favoriteSortOrder(sort: FavoriteSort) {
  return sort === "alpha"
    ? [asc(sql`lower(${TITLE_EXPR})`), asc(favorite.id)]
    : [desc(favorite.createdAt), desc(favorite.id)];
}

/** Listado propio de favoritos con paginación, filtros y conteo por tipo. */
export async function listMyFavorites(
  userId: string,
  page = 1,
  pageSize = 20,
  filters?: FavoriteFilters,
) {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  const { q, type, audience, sort } = normalizeFavoriteFilters(filters);

  const scopeConditions: SQL[] = [eq(favorite.userId, userId)];
  if (audience) scopeConditions.push(eq(favorite.audience, audience));
  if (q) scopeConditions.push(sql`${TITLE_EXPR} ilike ${`%${q}%`}`);

  const listConditions: SQL[] = [...scopeConditions];
  if (type === "artist") listConditions.push(isNotNull(favorite.artistId));
  else if (type === "release-group") listConditions.push(isNotNull(favorite.releaseGroupId));
  else if (type === "recording") listConditions.push(isNotNull(favorite.recordingId));

  const rows = await favoritesFrom()
    .where(and(...listConditions))
    .orderBy(asc(TYPE_RANK_EXPR), ...favoriteSortOrder(sort))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const counts = await favoriteCounts(scopeConditions);

  return {
    favorites: rows.slice(0, pageSize).map(serializeFavorite),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
    counts,
  };
}

/** Listado de favoritos de un usuario visible para un lector. */
export async function listUserFavorites(
  username: string,
  viewerId: string | null,
  page = 1,
  pageSize = 20,
) {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  // Importar getProfileByUsername aquí para evitar dependencia circular
  const { getProfileByUsername } = await import("@/services/social/profiles");
  const profile = await getProfileByUsername(username, viewerId);
  const audiences = audiencesForProfile(profile);

  const emptyCounts: FavoriteCounts = { artist: 0, "release-group": 0, recording: 0 };
  if (audiences.length === 0) {
    return { favorites: [], page, pageSize, hasNext: false, counts: emptyCounts };
  }

  const scopeConditions: SQL[] = [
    eq(favorite.userId, profile.id),
    inArray(favorite.audience, audiences),
  ];

  const rows = await favoritesFrom()
    .where(and(...scopeConditions))
    .orderBy(asc(TYPE_RANK_EXPR), desc(favorite.createdAt), desc(favorite.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const counts = await favoriteCounts(scopeConditions);

  return {
    favorites: rows.slice(0, pageSize).map(serializeFavorite),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
    counts,
  };
}

async function getOwnedFavorite(id: string, userId: string): Promise<FavoriteEntry> {
  const [row] = await db
    .select({
      id: favorite.id,
      audience: favorite.audience,
      createdAt: favorite.createdAt,
      artistId: favorite.artistId,
      releaseGroupId: favorite.releaseGroupId,
      recordingId: favorite.recordingId,
      artistName: artist.name,
      releaseTitle: releaseGroup.title,
      releaseCover: releaseGroup.coverThumbUrl,
      recordingTitle: recording.title,
    })
    .from(favorite)
    .leftJoin(artist, eq(favorite.artistId, artist.id))
    .leftJoin(releaseGroup, eq(favorite.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(favorite.recordingId, recording.id))
    .where(and(eq(favorite.id, id), eq(favorite.userId, userId)))
    .limit(1);

  if (!row) throw new ApiError("FAVORITE_NOT_FOUND", 404, "El favorito no existe");
  return serializeFavorite(row);
}

function serializeFavorite(row: {
  id: string;
  audience: string;
  createdAt: Date;
  artistId: string | null;
  releaseGroupId: string | null;
  recordingId: string | null;
  artistName: string | null;
  releaseTitle: string | null;
  releaseCover: string | null;
  recordingTitle: string | null;
}): FavoriteEntry {
  const targetType = targetTypeFromColumns(row.artistId, row.releaseGroupId, row.recordingId);
  let targetId = "";
  let title = "";
  let coverThumbUrl: string | null = null;

  if (row.artistId) {
    targetId = row.artistId;
    title = row.artistName ?? "";
  } else if (row.releaseGroupId) {
    targetId = row.releaseGroupId;
    title = row.releaseTitle ?? "";
    coverThumbUrl = row.releaseCover;
  } else if (row.recordingId) {
    targetId = row.recordingId;
    title = row.recordingTitle ?? "";
  }

  return {
    id: row.id,
    targetType,
    audience: row.audience as Audience,
    createdAt: row.createdAt.toISOString(),
    target: { id: targetId, title, coverThumbUrl },
  };
}
