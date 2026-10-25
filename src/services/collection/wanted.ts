import { and, asc, count, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { artist, collectionEntry, credit, releaseGroup, wantedEntry } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { assertAlbumExists, assertAttributesFitFormat } from "./collection";
import type {
  NewWantedVariant,
  WantedEntryChanges,
  WantedFilters,
  WantedPage,
  WantedSort,
  WantedEntry,
} from "./wanted-types";
import { WANTED_SORTS, type OwnedCopy } from "./wanted-types";
import { compatibleAttributes, normalizeAttributes } from "./vocabulary";
import { resolveNewContentAudience } from "@/services/social/default-audience";
import type { Audience } from "@/services/social/types";
import type { CollectionFormat, EditionAttribute } from "./vocabulary";

export type { WantedEntry } from "./wanted-types";

const MAX_PAGE_SIZE = 50;
const MAX_BATCH = 10;

interface WantedRow {
  id: string;
  format: string | null;
  attributes: string[];
  note: string | null;
  audience: string;
  createdAt: Date;
  updatedAt: Date;
  releaseGroupId: string;
  albumTitle: string | null;
  albumCover: string | null;
  albumDate?: string | null;
}

/** Año a partir de `first_release_date` (`YYYY-MM-DD`, a veces parcial). */
function releaseYear(date: string | null | undefined): number | null {
  const year = date ? Number.parseInt(date.slice(0, 4), 10) : Number.NaN;
  return Number.isFinite(year) ? year : null;
}


// Mismo patrón que collection.ts: subquery escalar del artista principal
// acreditado, para el buscador `q` y el orden alfabético por artista.
const PRIMARY_ARTIST_NAME = sql<string | null>`(
  SELECT a.name FROM credit a_c
  JOIN artist a ON a.id = a_c.artist_id
  WHERE a_c.release_group_id = ${wantedEntry.releaseGroupId}
    AND a_c.role = 'primary'
    AND a_c.recording_id IS NULL
  ORDER BY a_c.position
  LIMIT 1
)`;

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

function normalizeSort(filters: WantedFilters): WantedSort {
  const sort = filters.sort ?? "recent";
  if (!WANTED_SORTS.includes(sort)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
  }
  return sort;
}

function scopeConditions(userId: string, filters: WantedFilters): SQL[] {
  const conditions: SQL[] = [eq(wantedEntry.userId, userId)];
  const q = filters.q?.trim();
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      sql`(${releaseGroup.title} ilike ${pattern} OR ${PRIMARY_ARTIST_NAME} ilike ${pattern})`,
    );
  }
  return conditions;
}

function orderClauses(sort: WantedSort): SQL[] {
  if (sort === "alpha") {
    return [asc(sql`lower(${releaseGroup.title})`), desc(wantedEntry.id)];
  }
  return [desc(wantedEntry.createdAt), desc(wantedEntry.id)];
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

async function serializePage(rows: WantedRow[]): Promise<WantedEntry[]> {
  const artists = await primaryArtistsFor([...new Set(rows.map((row) => row.releaseGroupId))]);
  return rows.map((row) => serializeEntry(row, artists.get(row.releaseGroupId) ?? null));
}

function serializeEntry(
  row: WantedRow,
  primaryArtist: { id: string; name: string } | null,
): WantedEntry {
  return {
    id: row.id,
    format: row.format as CollectionFormat | null,
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
      year: releaseYear(row.albumDate),
    },
  };
}

const entrySelection = {
  id: wantedEntry.id,
  format: wantedEntry.format,
  attributes: wantedEntry.attributes,
  note: wantedEntry.note,
  audience: wantedEntry.audience,
  createdAt: wantedEntry.createdAt,
  updatedAt: wantedEntry.updatedAt,
  releaseGroupId: wantedEntry.releaseGroupId,
  albumTitle: releaseGroup.title,
  albumCover: releaseGroup.coverThumbUrl,
  albumDate: releaseGroup.firstReleaseDate,
} as const;

function normalizeVariant(variant: NewWantedVariant): {
  format: CollectionFormat | null;
  attributes: EditionAttribute[];
  note: string | null;
} {
  return {
    format: variant.format ?? null,
    attributes: normalizeAttributes(variant.attributes ?? []),
    note: variant.note ?? null,
  };
}

/**
 * Agrega una o varias variantes deseadas para un álbum, en una sola
 * transacción: si alguna falla, no se crea ninguna. No es un toggle: cada
 * llamada crea entradas nuevas, sin deduplicar contra existentes. Una sola
 * audiencia para todo el lote: la explícita o, sin ella, la audiencia por
 * defecto del usuario / del tipo (spec default-audience).
 */
export async function addWantedEntries(
  userId: string,
  releaseGroupId: string,
  variants: NewWantedVariant[],
  audience?: Audience,
): Promise<WantedEntry[]> {
  if (variants.length === 0 || variants.length > MAX_BATCH) {
    throw new ApiError("VALIDATION_ERROR", 400, "El lote de deseos no es válido");
  }
  for (const variant of variants) assertAttributesFitFormat(variant.format ?? null, variant.attributes ?? []);
  await assertAlbumExists(releaseGroupId);
  const resolvedAudience = await resolveNewContentAudience(userId, "wanted", audience);

  const created = await db.transaction(async (tx) => {
    const ids: string[] = [];
    for (const variant of variants) {
      const normalized = normalizeVariant(variant);
      const [row] = await tx
        .insert(wantedEntry)
        .values({
          userId,
          releaseGroupId,
          format: normalized.format,
          attributes: normalized.attributes,
          note: normalized.note,
          audience: resolvedAudience,
        })
        .returning({ id: wantedEntry.id });
      if (!row) throw new ApiError("INTERNAL_ERROR", 500, "No se pudo crear la entrada de deseo");
      ids.push(row.id);
    }
    return ids;
  });

  return getOwnedEntries(created, userId);
}

/**
 * Edita formato, atributos, nota y/o audiencia de una entrada de deseo propia. `format: null` la vuelve a "cualquier
 * formato". Igual que en la colección: los atributos enviados se validan contra el formato resultante y, si solo
 * cambia el formato, se quitan los que dejan de aplicar.
 */
export async function updateWantedEntry(
  entryId: string,
  userId: string,
  changes: WantedEntryChanges,
): Promise<WantedEntry> {
  const patch: Record<string, unknown> = {};
  if (changes.format !== undefined || changes.attributes !== undefined) {
    const [current] = await db
      .select({ format: wantedEntry.format, attributes: wantedEntry.attributes })
      .from(wantedEntry)
      .where(and(eq(wantedEntry.id, entryId), eq(wantedEntry.userId, userId)))
      .limit(1);
    if (!current) {
      throw new ApiError("WANTED_ENTRY_NOT_FOUND", 404, "La entrada de deseo no existe");
    }
    const format = changes.format !== undefined ? changes.format : (current.format as CollectionFormat | null);
    if (changes.format !== undefined) patch.format = changes.format;
    if (changes.attributes !== undefined) {
      assertAttributesFitFormat(format, changes.attributes);
      patch.attributes = normalizeAttributes(changes.attributes);
    } else {
      patch.attributes = compatibleAttributes(format, current.attributes);
    }
  }
  if (changes.note !== undefined) patch.note = changes.note;
  if (changes.audience !== undefined) patch.audience = changes.audience;

  const [updated] = await db
    .update(wantedEntry)
    .set(patch)
    .where(and(eq(wantedEntry.id, entryId), eq(wantedEntry.userId, userId)))
    .returning({ id: wantedEntry.id });

  if (!updated) {
    throw new ApiError("WANTED_ENTRY_NOT_FOUND", 404, "La entrada de deseo no existe");
  }
  const [entry] = await getOwnedEntries([updated.id], userId);
  return entry!;
}

/** Elimina una entrada de deseo propia. Devuelve 404 si no existe o no es del usuario. */
export async function removeWantedEntry(entryId: string, userId: string): Promise<void> {
  const [deleted] = await db
    .delete(wantedEntry)
    .where(and(eq(wantedEntry.id, entryId), eq(wantedEntry.userId, userId)))
    .returning({ id: wantedEntry.id });

  if (!deleted) {
    throw new ApiError("WANTED_ENTRY_NOT_FOUND", 404, "La entrada de deseo no existe");
  }
}

async function getOwnedEntries(entryIds: string[], userId: string): Promise<WantedEntry[]> {
  const rows = await db
    .select(entrySelection)
    .from(wantedEntry)
    .innerJoin(releaseGroup, eq(wantedEntry.releaseGroupId, releaseGroup.id))
    .where(and(inArray(wantedEntry.id, entryIds), eq(wantedEntry.userId, userId)))
    .orderBy(desc(wantedEntry.createdAt), desc(wantedEntry.id));

  return serializePage(rows);
}

/** Wishlist propia del usuario, paginada, con búsqueda y orden. */
export async function listOwnWanted(
  userId: string,
  page = 1,
  pageSize = 20,
  filters: WantedFilters = {},
): Promise<WantedPage> {
  assertPagination(page, pageSize);
  const sort = normalizeSort(filters);
  const scope = scopeConditions(userId, filters);

  const rows = await db
    .select(entrySelection)
    .from(wantedEntry)
    .innerJoin(releaseGroup, eq(wantedEntry.releaseGroupId, releaseGroup.id))
    .where(and(...scope))
    .orderBy(...orderClauses(sort))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);
  const total = await countOwnWanted(userId);
  const entries = await serializePage(rows.slice(0, pageSize));

  return {
    entries: await withOwnedCopies(userId, entries),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
    total,
  };
}

/**
 * "Ya tienes": copias de la colección del dueño para los álbumes de la página, en una sola consulta. Solo el listado
 * propio de Busco lo agrega; la colección y la búsqueda siguen siendo independientes.
 */
async function withOwnedCopies(userId: string, entries: WantedEntry[]): Promise<WantedEntry[]> {
  if (entries.length === 0) return entries;
  const albumIds = [...new Set(entries.map((entry) => entry.album.id))];
  const rows = await db
    .select({
      releaseGroupId: collectionEntry.releaseGroupId,
      format: collectionEntry.format,
      attributes: collectionEntry.attributes,
    })
    .from(collectionEntry)
    .where(and(eq(collectionEntry.userId, userId), inArray(collectionEntry.releaseGroupId, albumIds)))
    .orderBy(desc(collectionEntry.createdAt));
  const byAlbum = new Map<string, OwnedCopy[]>();
  for (const row of rows) {
    const copies = byAlbum.get(row.releaseGroupId) ?? [];
    copies.push({ format: row.format as CollectionFormat, attributes: normalizeAttributes(row.attributes) });
    byAlbum.set(row.releaseGroupId, copies);
  }
  return entries.map((entry) => ({ ...entry, owned: byAlbum.get(entry.album.id) ?? [] }));
}

/** Entradas de deseo del usuario sin filtros: la cifra de la pestaña Busco. */
export async function countOwnWanted(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(wantedEntry)
    .where(eq(wantedEntry.userId, userId));
  return Number(row?.value ?? 0);
}

/** Entradas de deseo propias del usuario para un álbum concreto (página de álbum). */
export async function listOwnWantedForReleaseGroup(
  userId: string,
  releaseGroupId: string,
): Promise<WantedEntry[]> {
  const rows = await db
    .select(entrySelection)
    .from(wantedEntry)
    .innerJoin(releaseGroup, eq(wantedEntry.releaseGroupId, releaseGroup.id))
    .where(and(eq(wantedEntry.userId, userId), eq(wantedEntry.releaseGroupId, releaseGroupId)))
    .orderBy(desc(wantedEntry.createdAt), desc(wantedEntry.id));

  return serializePage(rows);
}
