// Superficie pública de descubrimiento de listas de la comunidad `/lists`
// (cambio add-community-lists-surface).
//
// Cuatro secciones: Destacadas (curaduría editorial), Populares (por conteo
// agregado de guardados), De usuarios seguidos (solo con sesión) y Recientes
// (cronológico — vive en discovery.ts). Sin recomendación algorítmica.

import { and, count, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { appUser, listSave, userFollow, userList, userListFeatured } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import {
  assertPagination,
  enrichPublicLists,
  notBlockedByReader,
  PUBLIC_LIST_COLUMNS,
  type PublicListRow,
} from "./discovery";

/**
 * Sección "Destacadas": primero las listas editoriales oficiales publicadas de
 * `@exploracion`, luego las listas con fila en `user_list_featured` por `rank`
 * ascendente, sin duplicar una lista presente en ambos conjuntos ni filtrar por
 * tipo de entidad. Rail acotado, sin paginación (cambio
 * rework-public-lists-surface).
 */
export async function listFeaturedLists(readerId: string | null) {
  const [officialRows, featuredRows] = await Promise.all([
    db
      .select(PUBLIC_LIST_COLUMNS)
      .from(userList)
      .innerJoin(appUser, eq(userList.ownerId, appUser.id))
      .where(
        and(
          eq(userList.isOfficial, true),
          eq(userList.audience, "public"),
          eq(userList.moderationStatus, "visible"),
          eq(appUser.profileVisibility, "public"),
          isNull(userList.officialWithdrawnAt),
        ),
      )
      .orderBy(desc(userList.officialPublishedAt)),
    db
      .select(PUBLIC_LIST_COLUMNS)
      .from(userListFeatured)
      .innerJoin(userList, eq(userList.id, userListFeatured.listId))
      .innerJoin(appUser, eq(userList.ownerId, appUser.id))
      .where(and(eq(userList.audience, "public"), eq(userList.moderationStatus, "visible")))
      .orderBy(userListFeatured.rank),
  ]);

  const seen = new Set<string>();
  const merged: PublicListRow[] = [];
  for (const row of [...officialRows, ...featuredRows]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }

  return { lists: await enrichPublicLists(merged, readerId) };
}

/**
 * Sección "Populares": listas públicas de perfiles públicos con al menos un
 * guardado, ordenadas por conteo de guardados descendente y, a igualdad, por
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
        readerId ? ne(userList.ownerId, readerId) : undefined,
        notBlockedByReader(readerId),
      ),
    )
    .groupBy(userList.id, appUser.id)
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
