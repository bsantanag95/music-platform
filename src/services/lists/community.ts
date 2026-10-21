// Superficie pública de descubrimiento de listas de la comunidad `/lists`
// (cambio add-community-lists-surface).
//
// Cuatro secciones: Destacadas (listas editoriales oficiales), Populares (por conteo
// agregado de guardados), De usuarios seguidos (solo con sesión) y Recientes
// (cronológico — vive en discovery.ts). Sin recomendación algorítmica.

import { and, count, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, artist, listSave, recording, releaseGroup, userFollow, userList, userListItem } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import {
  assertPagination,
  enrichPublicLists,
  notBlockedByReader,
  PUBLIC_LIST_COLUMNS,
} from "./discovery";
import { activeUserCondition } from "@/services/auth/account-status";
import { notFeaturedCollectionCondition, notGeneratedCollectionCondition } from "@/services/discovery/collections/conditions";

/**
 * Sección "Destacadas": las listas editoriales oficiales publicadas de `@exploracion`, de la más reciente a la
 * más antigua, sin filtrar por tipo de entidad. Rail acotado, sin paginación.
 *
 * Las **colecciones** de Explorar no entran aquí, ni las generadas por plantilla ni las curadas con fila en
 * `user_list_featured` (openspec: unify-explore-collections, ADR 0038): una colección es contenido de la
 * plataforma y se recorre en `/explore/collections`, no entre las listas de la comunidad. La página enlaza allí
 * en lugar de mostrar sus tarjetas.
 */
export async function listFeaturedLists(readerId: string | null) {
  const officialRows = await db
    .select(PUBLIC_LIST_COLUMNS)
    .from(userList)
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(
      and(
        eq(userList.isOfficial, true),
        eq(userList.audience, "public"),
        eq(userList.moderationStatus, "visible"),
        eq(appUser.profileVisibility, "public"),
        activeUserCondition(),
        isNull(userList.officialWithdrawnAt),
        eq(userList.kind, "standard"),
        // Una oficial destacada en Explorar es una colección, no una lista de la comunidad (ADR 0038).
        notFeaturedCollectionCondition(),
      ),
    )
    .orderBy(desc(userList.officialPublishedAt));

  // Una lista vacía no aporta nada en una vitrina editorial: se omite hasta que tenga ítems (sigue
  // visible en su perfil y por enlace directo).
  const lists = (await enrichPublicLists(officialRows, readerId)).filter((list) => list.itemCount > 0);
  const names = await previewNamesFor(lists.map((list) => list.id));
  return { lists: lists.map((list) => ({ ...list, previewNames: names.get(list.id) ?? [] })) };
}

/** Cuántos nombres muestra la portada de una destacada única. */
export const PREVIEW_NAMES_MAX = 5;

/**
 * Primeros nombres de cada lista, en su orden: el título del álbum o de la canción, o el nombre del artista. Solo para las
 * destacadas (pocas y sin paginar): la portada de una destacada única los muestra bajo el título (redesign-lists-page, D7).
 */
async function previewNamesFor(listIds: string[]): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  if (listIds.length === 0) return result;
  const name = sql<string | null>`coalesce(${releaseGroup.title}, ${recording.title}, ${artist.name})`;
  const rows = await db
    .select({
      listId: userListItem.listId,
      name,
      rn: sql<number>`row_number() over (partition by ${userListItem.listId} order by ${userListItem.position})`,
    })
    .from(userListItem)
    .leftJoin(releaseGroup, eq(userListItem.releaseGroupId, releaseGroup.id))
    .leftJoin(recording, eq(userListItem.recordingId, recording.id))
    .leftJoin(artist, eq(userListItem.artistId, artist.id))
    .where(inArray(userListItem.listId, listIds));
  for (const row of rows.filter((r) => r.name && Number(r.rn) <= PREVIEW_NAMES_MAX).sort((a, b) => Number(a.rn) - Number(b.rn))) {
    const names = result.get(row.listId) ?? [];
    names.push(row.name!);
    result.set(row.listId, names);
  }
  return result;
}

/**
 * Guardados mínimos para entrar en "Populares". Con uno solo, la sección rotulada "las que más guarda la comunidad"
 * mostraba listas que guardó una única persona: prometía una popularidad que no existe. Si ninguna llega al
 * mínimo, la sección no se muestra (`page.tsx` omite una sección vacía).
 */
export const MIN_POPULAR_SAVES = 2;

/**
 * Sección "Populares": listas públicas de perfiles públicos con al menos
 * `MIN_POPULAR_SAVES` guardados, ordenadas por conteo de guardados descendente y, a igualdad, por
 * fecha de creación. Vitrina, no ranking: sin posiciones numeradas.
 */
export async function listPopularLists(
  readerId: string | null,
  page = 1,
  pageSize = 20,
) {
  assertPagination(page, pageSize);

  const saves = count(listSave.saverId);
  const rows = await db
    .select({ ...PUBLIC_LIST_COLUMNS, saves })
    .from(userList)
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .innerJoin(listSave, eq(listSave.listId, userList.id))
    .where(
      and(
        eq(userList.audience, "public"),
        eq(userList.moderationStatus, "visible"),
        eq(appUser.profileVisibility, "public"),
        activeUserCondition(),
        readerId ? ne(userList.ownerId, readerId) : undefined,
        notBlockedByReader(readerId),
        eq(userList.kind, "standard"),
        // Las colecciones generadas son contenido de Explorar, no de la comunidad (openspec: polish-community-lists).
        notGeneratedCollectionCondition(),
      ),
    )
    .groupBy(userList.id, appUser.id)
    .having(sql`${saves} >= ${MIN_POPULAR_SAVES}`)
    .orderBy(desc(saves), desc(userList.createdAt))
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

/**
 * Sección "De usuarios seguidos": listas visibles (audiencia `public` o
 * `followers`) de usuarios que el lector sigue con relación aceptada, orden
 * cronológico descendente. Requiere sesión.
 */
export async function listsFromFollowing(readerId: string, page = 1, pageSize = 20) {
  if (!readerId) {
    throw new ApiError("AUTH_REQUIRED", 401, "Se requiere una sesión activa");
  }
  assertPagination(page, pageSize);

  const rows = await db
    .select(PUBLIC_LIST_COLUMNS)
    .from(userList)
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .innerJoin(
      userFollow,
      and(
        eq(userFollow.followedId, userList.ownerId),
        eq(userFollow.followerId, readerId),
        eq(userFollow.status, "accepted"),
      ),
    )
    .where(
      and(
        inArray(userList.audience, ["public", "followers"]),
        eq(userList.moderationStatus, "visible"),
        ne(userList.ownerId, readerId),
        notBlockedByReader(readerId),
        eq(userList.kind, "standard"),
        // Como en Destacadas, una lista vacía no se muestra: aparece cuando tenga su primer ítem. El filtro va
        // en SQL (no después) para que la paginación no devuelva páginas cortas.
        sql`exists (select 1 from ${userListItem} where ${userListItem.listId} = ${userList.id})`,
      ),
    )
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
