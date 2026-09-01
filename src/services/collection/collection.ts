import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, collectionEntry, credit, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { audiencesForProfile } from "@/services/social/visibility";
import type { Audience } from "@/services/social/types";
import type {
  CollectionEntry,
  CollectionEntryChanges,
  CollectionFilters,
  CollectionPage,
  NewCollectionEntry,
} from "./types";
import { normalizeAttributes } from "./vocabulary";
import type { CollectionFormat, EditionAttribute } from "./vocabulary";

export type { CollectionEntry } from "./types";

const MAX_PAGE_SIZE = 50;

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

function assertPagination(page: number, pageSize: number) {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
}

function filterConditions(filters: CollectionFilters) {
  const conditions = [];
  if (filters.format) {
    conditions.push(eq(collectionEntry.format, filters.format));
  }
  if (filters.attribute) {
    // Contención de arrays: la entrada tiene el atributo pedido.
    conditions.push(sql`${collectionEntry.attributes} @> ARRAY[${filters.attribute}]::text[]`);
  }
  return conditions;
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

/** Colección propia del usuario, paginada y con filtros opcionales. */
export async function listOwnCollection(
  userId: string,
  page = 1,
  pageSize = 20,
  filters: CollectionFilters = {},
): Promise<CollectionPage> {
  assertPagination(page, pageSize);

  const rows = await db
    .select(entrySelection)
    .from(collectionEntry)
    .innerJoin(releaseGroup, eq(collectionEntry.releaseGroupId, releaseGroup.id))
    .where(and(eq(collectionEntry.userId, userId), ...filterConditions(filters)))
    .orderBy(desc(collectionEntry.createdAt), desc(collectionEntry.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  return {
    entries: await serializePage(rows.slice(0, pageSize)),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
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

  const { getProfileByUsername } = await import("@/services/social/profiles");
  const profile = await getProfileByUsername(username, viewerId);
  const audiences = audiencesForProfile(profile);

  if (audiences.length === 0) {
    return { entries: [], page, pageSize, hasNext: false };
  }

  const rows = await db
    .select(entrySelection)
    .from(collectionEntry)
    .innerJoin(releaseGroup, eq(collectionEntry.releaseGroupId, releaseGroup.id))
    .where(
      and(
        eq(collectionEntry.userId, profile.id),
        inArray(collectionEntry.audience, audiences),
        ...filterConditions(filters),
      ),
    )
    .orderBy(desc(collectionEntry.createdAt), desc(collectionEntry.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  return {
    entries: await serializePage(rows.slice(0, pageSize)),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
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
