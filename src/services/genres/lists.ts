import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, releaseGroup, userList, userListItem } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import {
  PUBLIC_LIST_COLUMNS,
  enrichPublicLists,
  publicListBaseConditions,
  type DiscoverListSummary,
} from "@/services/lists/discovery";
import { GENRE_LIST_MIN_ALBUMS, GENRE_PAGE_SIZE } from "./constants";
import { albumInGenreTreeOnce } from "./read";

// Listas de la comunidad de un género (openspec: redesign-genre-page, capability
// `genre-page-community`): listas públicas de álbumes con al menos `GENRE_LIST_MIN_ALBUMS` álbumes del
// género o de sus subgéneros. La visibilidad es la de "listas públicas que contienen un ítem"
// (`publicListBaseConditions`): audiencia pública, perfil público y cuenta activa, sin bloqueo con el
// lector, sin retiro oficial. Orden: guardados, álbumes del género, fecha.

export interface GenreList extends DiscoverListSummary {
  /** Álbumes de la lista que son del género o de un subgénero. */
  genreAlbumCount: number;
}

export interface GenreListPage {
  lists: GenreList[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export async function listGenreLists(
  readerId: string | null,
  genreId: string,
  { page = 1, pageSize = GENRE_PAGE_SIZE }: { page?: number; pageSize?: number } = {},
): Promise<GenreListPage> {
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }

  const genreAlbums = sql<number>`count(distinct ${userListItem.releaseGroupId})::int`;
  const saves = sql<number>`(select count(*)::int from list_save s where s.list_id = ${userList.id})`;
  const rows = await db
    .select({ ...PUBLIC_LIST_COLUMNS, genreAlbumCount: genreAlbums, saveCount: saves })
    .from(userList)
    .innerJoin(appUser, eq(userList.ownerId, appUser.id))
    .innerJoin(userListItem, eq(userListItem.listId, userList.id))
    .innerJoin(releaseGroup, eq(releaseGroup.id, userListItem.releaseGroupId))
    .where(and(...publicListBaseConditions(readerId), eq(userList.entityType, "release-group"), albumInGenreTreeOnce(genreId)))
    .groupBy(userList.id, appUser.id)
    .having(sql`count(distinct ${userListItem.releaseGroupId}) >= ${GENRE_LIST_MIN_ALBUMS}`)
    .orderBy(desc(saves), desc(genreAlbums), desc(userList.createdAt), desc(userList.id))
    .limit(pageSize + 1)
    .offset((page - 1) * pageSize);

  const pageRows = rows.slice(0, pageSize);
  const summaries = await enrichPublicLists(pageRows, readerId, { withSaveCount: true });
  const genreCounts = new Map(pageRows.map((r) => [r.id, Number(r.genreAlbumCount)]));
  return {
    lists: summaries.map((s) => ({ ...s, genreAlbumCount: genreCounts.get(s.id) ?? 0 })),
    page,
    pageSize,
    hasNext: rows.length > pageSize,
  };
}
