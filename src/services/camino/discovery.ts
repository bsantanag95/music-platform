// Descubrimiento público de Caminos populares (openspec: add-camino,
// capability camino-discovery): listas de álbumes visibles (públicas,
// `standard` o `custom_journey`) ordenadas por conteo de trackeo activo, no
// por guardado simple — señal de uso real, no de interés pasajero. Mismo
// criterio de vitrina que "Populares" de `/lists`: sin posiciones numeradas
// ni comparación entre usuarios individuales.

import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appUser, listSave, userList } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import type { FamilyKey } from "@/services/genres/families";
import { findStyleGenreBySlug, genreWithDescendants, parseFamilyKey } from "@/services/genres/read";
import { enrichLists } from "@/services/lists/lists";

export interface CaminoDiscoveryFilters {
  /** Clave de familia de géneros (`latin`, `rock`…). */
  family?: string;
  /** Slug de un género de la taxonomía; incluye sus subgéneros. */
  genre?: string;
  /** Búsqueda por nombre de artista (sin distinguir mayúsculas), no un id. */
  artistQuery?: string;
}

export interface CaminoDiscoverySummary {
  id: string;
  title: string;
  /** Ver `TrackedListSummary.kind` (saved-lists.ts) — determina la ruta de lectura. */
  kind: "standard" | "custom_journey";
  owner: { id: string; username: string; displayName: string | null };
  itemCount: number;
  coverThumbs: string[];
  trackingCount: number;
}

// "Al menos un álbum de la lista tiene ese género" — coincidencia por existencia, no por
// proporción (decidido en specs/camino-discovery/spec.md), sobre los géneros efectivos de cada
// álbum (con herencia del artista; openspec: add-genre-taxonomy).
function familyCondition(family: FamilyKey): SQL {
  return sql`EXISTS (
    SELECT 1 FROM user_list_item uli
    JOIN release_group_effective_genre e ON e.release_group_id = uli.release_group_id
    JOIN genre_family_member m ON m.genre_id = e.genre_id
    JOIN genre g ON g.id = e.genre_id AND g.kind = 'style'
    WHERE uli.list_id = ${userList.id} AND m.family_key = ${family}
  )`;
}

function genreTreeCondition(genreId: string): SQL {
  return sql`EXISTS (
    SELECT 1 FROM user_list_item uli
    JOIN release_group_effective_genre e ON e.release_group_id = uli.release_group_id
    WHERE uli.list_id = ${userList.id} AND e.genre_id IN ${genreWithDescendants(genreId)}
  )`;
}

// "Al menos un álbum de la lista está acreditado a ese artista" — cualquier
// rol de crédito (primary o featured), no solo el principal. Coincide por
// nombre (sin distinguir mayúsculas), no por id: el filtro es un buscador de
// texto, no un selector con autocompletado.
function artistCondition(artistQuery: string): SQL {
  return sql`EXISTS (
    SELECT 1 FROM user_list_item uli
    JOIN credit c ON c.release_group_id = uli.release_group_id
    JOIN artist a ON a.id = c.artist_id
    WHERE uli.list_id = ${userList.id} AND a.name ILIKE ${`%${artistQuery}%`}
  )`;
}

export async function discoverCaminos(
  filters: CaminoDiscoveryFilters = {},
  page = 1,
  pageSize = 20,
): Promise<{ caminos: CaminoDiscoverySummary[]; page: number; pageSize: number; hasNext: boolean }> {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  const conditions: SQL[] = [
    eq(userList.audience, "public"),
    eq(userList.entityType, "release-group"),
    sql`${userList.kind} IN ('standard', 'custom_journey')`,
    eq(listSave.tracking, true),
  ];
  // Una familia o un género desconocido no coincide con ninguna lista ("sin resultados").
  if (filters.family) {
    const family = parseFamilyKey(filters.family);
    if (!family) return { caminos: [], page, pageSize, hasNext: false };
    conditions.push(familyCondition(family));
  }
  if (filters.genre) {
    const found = await findStyleGenreBySlug(filters.genre);
    if (!found) return { caminos: [], page, pageSize, hasNext: false };
    conditions.push(genreTreeCondition(found.id));
  }
  if (filters.artistQuery) conditions.push(artistCondition(filters.artistQuery));

  const rows = await db
    .select({
      id: userList.id,
      title: userList.title,
      kind: userList.kind,
      ownerId: appUser.id,
      ownerUsername: appUser.username,
      ownerDisplayName: appUser.displayName,
      trackingCount: sql<number>`count(distinct ${listSave.saverId})::int`,
    })
    .from(userList)
    .innerJoin(listSave, eq(listSave.listId, userList.id))
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(and(...conditions))
    .groupBy(userList.id, appUser.id)
    .orderBy(desc(sql`count(distinct ${listSave.saverId})`), desc(userList.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const pageRows = rows.slice(0, pageSize);
  const enrichment = await enrichLists(pageRows.map((row) => row.id));

  return {
    caminos: pageRows.map((row) => ({
      id: row.id,
      title: row.title,
      kind: row.kind as "standard" | "custom_journey",
      owner: { id: row.ownerId, username: row.ownerUsername, displayName: row.ownerDisplayName },
      itemCount: enrichment.get(row.id)?.itemCount ?? 0,
      coverThumbs: enrichment.get(row.id)?.coverThumbs ?? [],
      trackingCount: row.trackingCount,
    })),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}
