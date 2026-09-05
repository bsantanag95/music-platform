// Descubrir listas públicas de la comunidad (cambio rework-lists-section).
//
// Vidriera cronológica: listas de audiencia `public` de perfiles `public`,
// excluyendo las propias y cualquier bloqueo. Sin recomendación algorítmica —
// orden estricto por fecha de creación descendente.

import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, userBlock, userList } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { enrichLists } from "./lists";
import { savedStateFor } from "./saved-lists";
import type { ListEntityType } from "./types";

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
  saved: boolean;
  following: boolean;
}

export async function listDiscoverLists(readerId: string, page = 1, pageSize = 20) {
  if (page < 1 || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  const rows = await db
    .select({
      id: userList.id,
      entityType: userList.entityType,
      title: userList.title,
      description: userList.description,
      createdAt: userList.createdAt,
      updatedAt: userList.updatedAt,
      ownerId: appUser.id,
      ownerUsername: appUser.username,
      ownerDisplayName: appUser.displayName,
    })
    .from(userList)
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .where(
      and(
        eq(userList.audience, "public"),
        eq(appUser.profileVisibility, "public"),
        ne(userList.ownerId, readerId),
        // Sin bloqueo en ninguna dirección entre lector y dueño.
        sql`not exists (
          select 1 from ${userBlock}
          where (${userBlock.blockerId} = ${readerId} and ${userBlock.blockedId} = ${userList.ownerId})
             or (${userBlock.blockerId} = ${userList.ownerId} and ${userBlock.blockedId} = ${readerId})
        )`,
      ),
    )
    .orderBy(desc(userList.createdAt), desc(userList.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const pageRows = rows.slice(0, pageSize);
  const [enrichment, savedState] = await Promise.all([
    enrichLists(pageRows.map((row) => row.id)),
    savedStateFor(
      readerId,
      pageRows.map((row) => row.id),
    ),
  ]);

  return {
    lists: pageRows.map((row): DiscoverListSummary => {
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
        saved: state?.saved ?? false,
        following: state?.following ?? false,
      };
    }),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}
