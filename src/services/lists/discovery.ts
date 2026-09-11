// Descubrir listas públicas de la comunidad (cambios rework-lists-section,
// add-community-lists-surface).
//
// Vidriera cronológica: listas de audiencia `public` de perfiles `public`,
// excluyendo cualquier bloqueo y —cuando hay lector con sesión— las propias.
// Sin recomendación algorítmica: orden estricto por fecha de creación
// descendente. Accesible con y sin sesión (la sección "Recientes" de `/lists`).

import { and, count, desc, eq, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appUser, listSave, userBlock, userList } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { enrichLists } from "./lists";
import { saveCountsFor, savedStateFor } from "./saved-lists";
import {
  LIST_ENTITY_TYPES,
  PUBLIC_LIST_SORTS,
  type ListEntityType,
  type PublicListSort,
} from "./types";

/** Filtros opcionales del listado público (cambio rework-public-lists-surface). */
export interface DiscoverListFilters {
  /** Búsqueda por texto sobre título y descripción. */
  q?: string;
  entityType?: ListEntityType;
  /** `recent` (default) o `popular` (conteo agregado de guardados). */
  sort?: PublicListSort;
}

export interface DiscoverListSummary {
  id: string;
  entityType: ListEntityType;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  coverThumbs: string[];
  owner: { id: string; username: string; displayName: string | null };
  isOfficial: boolean;
  saved: boolean;
  following: boolean;
  /** Conteo agregado de guardados. Solo lo puebla "Populares". */
  saveCount?: number;
}

/** Columnas comunes de una fila de lista pública con su dueño. */
export const PUBLIC_LIST_COLUMNS = {
  id: userList.id,
  entityType: userList.entityType,
  title: userList.title,
  description: userList.description,
  createdAt: userList.createdAt,
  updatedAt: userList.updatedAt,
  ownerId: appUser.id,
  ownerUsername: appUser.username,
  ownerDisplayName: appUser.displayName,
  isOfficial: userList.isOfficial,
} as const;

export interface PublicListRow {
  id: string;
  entityType: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string | null;
  isOfficial: boolean;
}

/**
 * Sin bloqueo en ninguna dirección entre `readerId` y el dueño de la lista.
 * Con `readerId` nulo (lector anónimo) no aplica ningún bloqueo.
 */
export function notBlockedByReader(readerId: string | null): SQL | undefined {
  if (!readerId) return undefined;
  return sql`not exists (
    select 1 from ${userBlock}
    where (${userBlock.blockerId} = ${readerId} and ${userBlock.blockedId} = ${userList.ownerId})
       or (${userBlock.blockerId} = ${userList.ownerId} and ${userBlock.blockedId} = ${readerId})
  )`;
}

/**
 * Enriquece filas de listas públicas con conteo de ítems, carátulas, estado de
 * guardado del lector (vacío para anónimo) y, opcionalmente, conteo agregado de
 * guardados.
 */
export async function enrichPublicLists(
  rows: PublicListRow[],
  readerId: string | null,
  options: { withSaveCount?: boolean } = {},
): Promise<DiscoverListSummary[]> {
  const ids = rows.map((row) => row.id);
  const [enrichment, savedState, saveCounts] = await Promise.all([
    enrichLists(ids),
    readerId
      ? savedStateFor(readerId, ids)
      : Promise.resolve(new Map<string, { saved: boolean; following: boolean }>()),
    options.withSaveCount
      ? saveCountsFor(ids)
      : Promise.resolve(new Map<string, number>()),
  ]);

  return rows.map((row): DiscoverListSummary => {
    const enriched = enrichment.get(row.id);
    const state = savedState.get(row.id);
    return {
      id: row.id,
      entityType: row.entityType as ListEntityType,
      title: row.title,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      itemCount: enriched?.itemCount ?? 0,
      coverThumbs: enriched?.coverThumbs ?? [],
      owner: {
        id: row.ownerId,
        username: row.ownerUsername,
        displayName: row.ownerDisplayName,
      },
      isOfficial: row.isOfficial,
      saved: state?.saved ?? false,
      following: state?.following ?? false,
      ...(options.withSaveCount ? { saveCount: saveCounts.get(row.id) ?? 0 } : {}),
    };
  });
}

export function assertPagination(page: number, pageSize: number): void {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
}

function normalizeDiscoverFilters(filters?: DiscoverListFilters): {
  q: string | undefined;
  entityType: ListEntityType | undefined;
  sort: PublicListSort;
} {
  const q = filters?.q?.trim();
  if (filters?.entityType && !LIST_ENTITY_TYPES.includes(filters.entityType)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El tipo de contenido no es válido");
  }
  const sort = filters?.sort ?? "recent";
  if (!PUBLIC_LIST_SORTS.includes(sort)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El orden no es válido");
  }
  return { q: q ? q : undefined, entityType: filters?.entityType, sort };
}

/**
 * Listas públicas de otros usuarios. Por defecto en orden cronológico
 * descendente; con `filters` se acota por texto/tipo y se puede ordenar por
 * guardados (`sort=popular`, listas sin guardados al final). `readerId` nulo =
 * lector anónimo: sin exclusión de listas propias y sin estado de guardado.
 */
export async function listDiscoverLists(
  readerId: string | null,
  page = 1,
  pageSize = 20,
  filters?: DiscoverListFilters,
) {
  assertPagination(page, pageSize);
  const { q, entityType, sort } = normalizeDiscoverFilters(filters);

  const conditions: (SQL | undefined)[] = [
    eq(userList.audience, "public"),
    eq(userList.moderationStatus, "visible"),
    eq(appUser.profileVisibility, "public"),
    // Listas retiradas por un administrador no reaparecen en el descubrimiento
    // público mientras permanezcan retiradas (spec official-editorial-content).
    isNull(userList.officialWithdrawnAt),
    readerId ? ne(userList.ownerId, readerId) : undefined,
    notBlockedByReader(readerId),
  ];
  if (entityType) conditions.push(eq(userList.entityType, entityType));
  if (q) {
    conditions.push(
      or(ilike(userList.title, `%${q}%`), ilike(userList.description, `%${q}%`)),
    );
  }

  // Orden por guardados: TODO parte de la misma visibilidad, con las listas sin
  // guardados al final (LEFT JOIN + conteo 0), a diferencia de la sección
  // "Populares" que exige al menos un guardado.
  if (sort === "popular") {
    const saves = count(listSave.saverId);
    const rows = await db
      .select({ ...PUBLIC_LIST_COLUMNS, saves })
      .from(userList)
      .innerJoin(appUser, eq(userList.ownerId, appUser.id))
      .leftJoin(listSave, eq(listSave.listId, userList.id))
      .where(and(...conditions))
      .groupBy(userList.id, appUser.id)
      .orderBy(desc(saves), desc(userList.createdAt), desc(userList.id))
      .limit(pageSize + 1)
      .offset((page - 1) * pageSize);

    const pageRows = rows.slice(0, pageSize);
    return {
      lists: await enrichPublicLists(pageRows, readerId, { withSaveCount: true }),
      page,
      pageSize,
      hasNext: rows.length > pageSize,
    };
  }

  const rows = await db
    .select(PUBLIC_LIST_COLUMNS)
    .from(userList)
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(and(...conditions))
    .orderBy(desc(userList.createdAt), desc(userList.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const pageRows = rows.slice(0, pageSize);
  return {
    lists: await enrichPublicLists(pageRows, readerId),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}
