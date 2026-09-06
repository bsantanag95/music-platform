import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { artist, collectionEntry, credit, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience } from "@/services/social/types";
import type {
  CollectionCounts,
  CollectionEntry,
  CollectionEntryChanges,
  CollectionFilters,
  CollectionGrouping,
  CollectionPage,
  CollectionSort,
  NewCollectionEntry,
} from "./types";
import { COLLECTION_GROUPINGS, COLLECTION_SORTS } from "./types";
import { normalizeAttributes } from "./vocabulary";
import type { CollectionFormat, EditionAttribute } from "./vocabulary";

export type { CollectionEntry } from "./types";

const MAX_PAGE_SIZE = 50;
const MAX_BULK_IDS = 50;

interface EntryRow {
  id: string;
  format: string;
  attributes: string[];
  note: string | null;
  audience: string;
  createdAt: Date;
  updatedAt: Date;
  releaseGroupId: string;
  albumTitle: string | null;
  albumCover: string | null;
}

// Nombre del artista principal acreditado del álbum de una entrada. Subquery
// escalar: no multiplica filas aunque haya varios créditos primarios (toma el de
// menor `position`). Se usa para el buscador `q` y para ordenar / agrupar por
// artista. Para la serialización se sigue usando `primaryArtistsFor` (que además
// resuelve el id del artista para el enlace).
const PRIMARY_ARTIST_NAME = sql<string | null>`(
  SELECT a.name FROM credit a_c
  JOIN artist a ON a.id = a_c.artist_id
  WHERE a_c.release_group_id = ${collectionEntry.releaseGroupId}
    AND a_c.role = 'primary'
    AND a_c.recording_id IS NULL
  ORDER BY a_c.position
  LIMIT 1
)`;

// Rango fijo de formato para ordenar / agrupar: vinyl < cd < cassette < other.
const FORMAT_RANK = sql`case ${collectionEntry.format}
  when 'vinyl' then 0 when 'cd' then 1 when 'cassette' then 2 else 3 end`;

function assertPagination(page: number, pageSize: number) {
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > MAX_PAGE_SIZE
  ) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
}

function normalizeSortGroup(filters: CollectionFilters): {
  sort: CollectionSort;
  group: CollectionGrouping;
} {
  const sort = filters.sort ?? "recent";
  const group = filters.group ?? "none";
  if (!COLLECTION_SORTS.includes(sort)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
  }
  if (!COLLECTION_GROUPINGS.includes(group)) {
    throw new ApiError("VALIDATION_ERROR", 400, "La agrupación no es válida");
  }
  return { sort, group };
}

/** Condiciones que acotan tanto el listado como el conteo (userId + `q` + atributo). */
function scopeConditions(userId: string, filters: CollectionFilters): SQL[] {
  const conditions: SQL[] = [eq(collectionEntry.userId, userId)];
  const q = filters.q?.trim();
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      sql`(${releaseGroup.title} ilike ${pattern} OR ${PRIMARY_ARTIST_NAME} ilike ${pattern})`,
    );
  }
  if (filters.attribute) {
    conditions.push(sql`${collectionEntry.attributes} @> ARRAY[${filters.attribute}]::text[]`);
  }
  return conditions;
}

/** El filtro de formato solo entra en el listado, nunca en el conteo por formato. */
function formatCondition(filters: CollectionFilters): SQL[] {
  return filters.format ? [eq(collectionEntry.format, filters.format)] : [];
}

function orderClauses(sort: CollectionSort, group: CollectionGrouping): SQL[] {
  const artistOrder = sql`lower(${PRIMARY_ARTIST_NAME})`;
  const sortOrder: SQL[] = (() => {
    switch (sort) {
      case "alpha":
        return [asc(sql`lower(${releaseGroup.title})`), desc(collectionEntry.id)];
      case "artist":
        return [asc(artistOrder), desc(collectionEntry.id)];
      case "format":
        return [asc(FORMAT_RANK), desc(collectionEntry.createdAt), desc(collectionEntry.id)];
      default:
        return [desc(collectionEntry.createdAt), desc(collectionEntry.id)];
    }
  })();

  // Prefijo de agrupación; se omite si el `sort` ya empieza por esa misma clave.
  const prefix: SQL[] =
    group === "format" && sort !== "format"
      ? [asc(FORMAT_RANK)]
      : group === "artist" && sort !== "artist"
        ? [asc(artistOrder)]
        : [];

  return [...prefix, ...sortOrder];
}

/** Artista principal de cada álbum, en una sola consulta por lote. */
async function primaryArtistsFor(
  releaseGroupIds: string[],
): Promise<Map<string, { id: string; name: string }>> {
  const result = new Map<string, { id: string; name: string }>();
  if (releaseGroupIds.length === 0) return result;

  const rows = await db
    .select({
      releaseGroupId: credit.releaseGroupId,
      position: credit.position,
      artistId: artist.id,
      artistName: artist.name,
    })
    .from(credit)
    .innerJoin(artist, eq(artist.id, credit.artistId))
    .where(
      and(
        inArray(credit.releaseGroupId, releaseGroupIds),
        eq(credit.role, "primary"),
        isNull(credit.recordingId),
      ),
    )
    .orderBy(asc(credit.position));

  for (const row of rows) {
    if (!row.releaseGroupId || result.has(row.releaseGroupId)) continue;
    result.set(row.releaseGroupId, { id: row.artistId, name: row.artistName });
  }
  return result;
}

async function serializePage(rows: EntryRow[]): Promise<CollectionEntry[]> {
  const artists = await primaryArtistsFor([...new Set(rows.map((row) => row.releaseGroupId))]);
  return rows.map((row) => serializeEntry(row, artists.get(row.releaseGroupId) ?? null));
}

function serializeEntry(
  row: EntryRow,
  primaryArtist: { id: string; name: string } | null,
): CollectionEntry {
  return {
    id: row.id,
    format: row.format as CollectionFormat,
    attributes: normalizeAttributes(row.attributes),
    note: row.note,
    audience: row.audience as Audience,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    album: {
      id: row.releaseGroupId,
      title: row.albumTitle ?? "",
      coverThumbUrl: row.albumCover,
      artistId: primaryArtist?.id ?? null,
      artistName: primaryArtist?.name ?? null,
    },
  };
}

const entrySelection = {
  id: collectionEntry.id,
  format: collectionEntry.format,
  attributes: collectionEntry.attributes,
  note: collectionEntry.note,
  audience: collectionEntry.audience,
  createdAt: collectionEntry.createdAt,
  updatedAt: collectionEntry.updatedAt,
  releaseGroupId: collectionEntry.releaseGroupId,
  albumTitle: releaseGroup.title,
  albumCover: releaseGroup.coverThumbUrl,
} as const;

const EMPTY_COUNTS: CollectionCounts = { vinyl: 0, cd: 0, cassette: 0, other: 0 };

/** Conteo de entradas por formato sobre `conditions` (userId + `q` + atributo, nunca formato). */
async function collectionCounts(conditions: SQL[]): Promise<CollectionCounts> {
  const rows = await db
    .select({
      format: collectionEntry.format,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(collectionEntry)
    .innerJoin(releaseGroup, eq(collectionEntry.releaseGroupId, releaseGroup.id))
    .where(and(...conditions))
    .groupBy(collectionEntry.format);

  const counts: CollectionCounts = { ...EMPTY_COUNTS };
  for (const row of rows) {
    if (row.format === "vinyl" || row.format === "cd" || row.format === "cassette") {
      counts[row.format] = row.count;
    } else {
      counts.other += row.count;
    }
  }
  return counts;
}

/** Valida que el álbum exista antes de crear una entrada. */
async function assertAlbumExists(releaseGroupId: string) {
  const [row] = await db
    .select({ id: releaseGroup.id })
    .from(releaseGroup)
    .where(eq(releaseGroup.id, releaseGroupId))
    .limit(1);
  if (!row) throw new ApiError("ALBUM_NOT_FOUND", 404, "El álbum indicado no existe");
}

/**
 * Agrega una entrada nueva a la colección física del usuario. No es un toggle:
 * cada llamada crea una entrada, aunque ya exista otra para el mismo álbum y
 * formato.
 */
export async function addEntry(userId: string, input: NewCollectionEntry): Promise<CollectionEntry> {
  await assertAlbumExists(input.releaseGroupId);

  const [created] = await db
    .insert(collectionEntry)
    .values({
      userId,
      releaseGroupId: input.releaseGroupId,
      format: input.format,
      attributes: normalizeAttributes(input.attributes ?? []),
      note: input.note ?? null,
      audience: input.audience ?? "followers",
    })
    .returning({ id: collectionEntry.id });

  if (!created) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear la entrada de colección");
  return getOwnedEntry(created.id, userId);
}

/** Edita una entrada propia (formato, atributos, nota, audiencia). */
export async function updateEntry(
  entryId: string,
  userId: string,
  changes: CollectionEntryChanges,
): Promise<CollectionEntry> {
  const patch: Record<string, unknown> = {};
  if (changes.format !== undefined) patch.format = changes.format;
  if (changes.attributes !== undefined) patch.attributes = normalizeAttributes(changes.attributes);
  if (changes.note !== undefined) patch.note = changes.note;
  if (changes.audience !== undefined) patch.audience = changes.audience;

  const [updated] = await db
    .update(collectionEntry)
    .set(patch)
    .where(and(eq(collectionEntry.id, entryId), eq(collectionEntry.userId, userId)))
    .returning({ id: collectionEntry.id });

  if (!updated) {
    throw new ApiError("COLLECTION_ENTRY_NOT_FOUND", 404, "La entrada de colección no existe");
  }
  return getOwnedEntry(updated.id, userId);
}

/**
 * Cambia la audiencia de varias entradas propias a la vez. Idempotente; los ids
 * ajenos o inexistentes del conjunto se ignoran. Si ningún id corresponde a una
 * entrada del usuario, lanza `COLLECTION_ENTRY_NOT_FOUND`. Devuelve los ids
 * efectivamente actualizados.
 */
export async function updateEntriesAudienceBulk(
  userId: string,
  entryIds: string[],
  audience: Audience,
): Promise<string[]> {
  if (entryIds.length === 0 || entryIds.length > MAX_BULK_IDS) {
    throw new ApiError("VALIDATION_ERROR", 400, "La selección de entradas no es válida");
  }

  const updated = await db
    .update(collectionEntry)
    .set({ audience })
    .where(and(inArray(collectionEntry.id, entryIds), eq(collectionEntry.userId, userId)))
    .returning({ id: collectionEntry.id });

  if (updated.length === 0) {
    throw new ApiError("COLLECTION_ENTRY_NOT_FOUND", 404, "Ninguna entrada de la selección es tuya");
  }
  return updated.map((row) => row.id);
}

/** Elimina una entrada propia. Devuelve 404 si no existe o no es del usuario. */
export async function removeEntry(entryId: string, userId: string): Promise<void> {
  const [deleted] = await db
    .delete(collectionEntry)
    .where(and(eq(collectionEntry.id, entryId), eq(collectionEntry.userId, userId)))
    .returning({ id: collectionEntry.id });

  if (!deleted) {
    throw new ApiError("COLLECTION_ENTRY_NOT_FOUND", 404, "La entrada de colección no existe");
  }
}

async function getOwnedEntry(entryId: string, userId: string): Promise<CollectionEntry> {
  const [row] = await db
    .select(entrySelection)
    .from(collectionEntry)
    .innerJoin(releaseGroup, eq(collectionEntry.releaseGroupId, releaseGroup.id))
    .where(and(eq(collectionEntry.id, entryId), eq(collectionEntry.userId, userId)))
    .limit(1);

  if (!row) {
    throw new ApiError("COLLECTION_ENTRY_NOT_FOUND", 404, "La entrada de colección no existe");
  }
  const [entry] = await serializePage([row]);
  return entry!;
}

/** Colección propia del usuario, paginada, con filtros, orden, agrupación y conteo por formato. */
export async function listOwnCollection(
  userId: string,
  page = 1,
  pageSize = 20,
  filters: CollectionFilters = {},
): Promise<CollectionPage> {
  assertPagination(page, pageSize);
  const { sort, group } = normalizeSortGroup(filters);

  const scope = scopeConditions(userId, filters);

  const rows = await db
    .select(entrySelection)
    .from(collectionEntry)
    .innerJoin(releaseGroup, eq(collectionEntry.releaseGroupId, releaseGroup.id))
    .where(and(...scope, ...formatCondition(filters)))
    .orderBy(...orderClauses(sort, group))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const counts = await collectionCounts(scope);

  return {
    entries: await serializePage(rows.slice(0, pageSize)),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
    counts,
  };
}

/** Colección de un usuario visible para un lector, filtrada por audiencia. */
export async function listProfileCollection(
  username: string,
  viewerId: string | null,
  page = 1,
  pageSize = 20,
  filters: CollectionFilters = {},
): Promise<CollectionPage> {
  assertPagination(page, pageSize);
  const { sort, group } = normalizeSortGroup(filters);

  const { getProfileByUsername } = await import("@/services/social/profiles");
  const profile = await getProfileByUsername(username, viewerId);
  const audiences = audiencesForProfile(profile);

  if (audiences.length === 0) {
    return { entries: [], page, pageSize, hasNext: false, counts: { ...EMPTY_COUNTS } };
  }

  const scope: SQL[] = [
    ...scopeConditions(profile.id, filters),
    inArray(collectionEntry.audience, audiences),
  ];

  const rows = await db
    .select(entrySelection)
    .from(collectionEntry)
    .innerJoin(releaseGroup, eq(collectionEntry.releaseGroupId, releaseGroup.id))
    .where(and(...scope, ...formatCondition(filters)))
    .orderBy(...orderClauses(sort, group))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const counts = await collectionCounts(scope);

  return {
    entries: await serializePage(rows.slice(0, pageSize)),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
    counts,
  };
}

/** Entradas propias del usuario para un álbum concreto (acción en la página de álbum). */
export async function listOwnEntriesForReleaseGroup(
  userId: string,
  releaseGroupId: string,
): Promise<CollectionEntry[]> {
  const rows = await db
    .select(entrySelection)
    .from(collectionEntry)
    .innerJoin(releaseGroup, eq(collectionEntry.releaseGroupId, releaseGroup.id))
    .where(
      and(eq(collectionEntry.userId, userId), eq(collectionEntry.releaseGroupId, releaseGroupId)),
    )
    .orderBy(desc(collectionEntry.createdAt), desc(collectionEntry.id));

  return serializePage(rows);
}

export type { EditionAttribute };
