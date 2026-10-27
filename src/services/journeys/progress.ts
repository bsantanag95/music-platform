// Progreso derivado, compartido por todo subtipo de user_list con noción de
// "recorrido" (openspec: add-camino, generalizando el mecanismo introducido
// por add-artist-journey). El progreso NUNCA se persiste: se deriva en el
// momento de lectura cruzando los ítems de una lista contra `listen_entry` de
// quien trackea — que puede o no ser el dueño de la lista (un Camino propio:
// dueño y quien trackea son la misma persona; una lista ajena trackeada: son
// personas distintas). Ver docs/00-product/product_philosophy.md §6.4 y
// design.md de `add-camino` (Decisión D2).

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { listenEntry, releaseGroup, userListItem } from "@/db/schema";

export type JourneyState = "in_progress" | "complete" | "archived";

/** Estado derivado — nunca persistido. */
export function deriveJourneyState(
  archivedAt: Date | null,
  selectedCount: number,
  listenedCount: number,
): JourneyState {
  if (archivedAt) return "archived";
  if (selectedCount > 0 && listenedCount === selectedCount) return "complete";
  return "in_progress";
}

/**
 * Cuenta, para un conjunto de `listId`, la cantidad de ítems totales y de
 * ítems con al menos una escucha de `trackerId` registrada en su diario, en
 * una sola consulta agregada (no N+1). `trackerId` es quien trackea el
 * progreso — el dueño de la lista cuando es un Camino o recorrido propio, o
 * cualquier otro usuario cuando trackea una lista ajena (Requirement
 * "Trackear el progreso propio sobre una lista ajena" de `list-saves`).
 *
 * LEFT JOIN contra `listen_entry` puede multiplicar filas si `trackerId`
 * escuchó el mismo álbum más de una vez — por eso ambos agregados cuentan
 * `DISTINCT user_list_item.id` (un ítem por álbum, invariante ya garantizada
 * por la unicidad `(list_id, release_group_id)` de `user_list_item`), no
 * `count(*)`.
 */
export async function countsByListId(
  trackerId: string,
  listIds: string[],
): Promise<Map<string, { selected: number; listened: number }>> {
  const result = new Map<string, { selected: number; listened: number }>();
  if (listIds.length === 0) return result;

  const counts = await db
    .select({
      listId: userListItem.listId,
      selected: sql<number>`count(distinct ${userListItem.id})::int`,
      listened: sql<number>`count(distinct ${userListItem.id}) filter (where ${listenEntry.id} is not null)::int`,
    })
    .from(userListItem)
    .leftJoin(
      listenEntry,
      and(
        eq(listenEntry.releaseGroupId, userListItem.releaseGroupId),
        eq(listenEntry.userId, trackerId),
      ),
    )
    .where(inArray(userListItem.listId, listIds))
    .groupBy(userListItem.listId);

  for (const c of counts) result.set(c.listId, { selected: c.selected, listened: c.listened });
  return result;
}

/**
 * De `releaseGroupIds`, los que `trackerId` tiene registrados en su diario
 * (cualquier escucha, sin filtro de audiencia — es lectura del propio
 * trackeo sobre su propio progreso). Complementa a `countsByListId` cuando
 * hace falta el detalle álbum por álbum, no solo el agregado — p. ej. para
 * marcar cada ítem individualmente como escuchado en una vista de detalle.
 */
export async function listenedReleaseGroupIds(
  trackerId: string,
  releaseGroupIds: string[],
): Promise<Set<string>> {
  if (releaseGroupIds.length === 0) return new Set();
  const rows = await db
    .select({ releaseGroupId: listenEntry.releaseGroupId })
    .from(listenEntry)
    .where(
      and(eq(listenEntry.userId, trackerId), inArray(listenEntry.releaseGroupId, releaseGroupIds)),
    )
    .groupBy(listenEntry.releaseGroupId);
  return new Set(rows.map((r) => r.releaseGroupId).filter((id): id is string => id !== null));
}

/** Siguiente disco sin escuchar de una selección: lo que la fila de /me/progress propone escuchar. */
export interface NextUpAlbum {
  id: string;
  title: string;
  artistName: string | null;
  year: number | null;
}

export interface ProgressDetail {
  nextUp: NextUpAlbum | null;
  /** Fecha de la escucha más reciente de un disco de la selección, ISO; `null` si no hay ninguna. */
  lastListenedAt: string | null;
}

/**
 * Para cada lista, el siguiente disco sin escuchar y la última escucha de `trackerId` sobre su selección (openspec:
 * redesign-progress-views, D1). Dos consultas por lote, no N+1. "Siguiente" respeta el orden propio de cada tipo: en una
 * discografía (`order: "release"`) el más antiguo por fecha de publicación; en una lista (`order: "position"`) el orden
 * manual de su dueño. No dice cuántos faltan: solo nombra un disco (§6.4.1).
 */
export async function progressDetailsByListId(
  trackerId: string,
  lists: { id: string; order: "release" | "position" }[],
): Promise<Map<string, ProgressDetail>> {
  const result = new Map<string, ProgressDetail>();
  if (lists.length === 0) return result;
  const listIds = lists.map((list) => list.id);

  const [lastRows, pendingRows] = await Promise.all([
    db
      .select({
        listId: userListItem.listId,
        last: sql<string | null>`max(${listenEntry.createdAt})::text`,
      })
      .from(userListItem)
      .innerJoin(
        listenEntry,
        and(eq(listenEntry.releaseGroupId, userListItem.releaseGroupId), eq(listenEntry.userId, trackerId)),
      )
      .where(inArray(userListItem.listId, listIds))
      .groupBy(userListItem.listId),
    db
      .select({
        listId: userListItem.listId,
        position: userListItem.position,
        id: releaseGroup.id,
        title: releaseGroup.title,
        firstReleaseDate: releaseGroup.firstReleaseDate,
        year: releaseGroup.firstReleaseYear,
        artistName: sql<string | null>`(
          SELECT a.name FROM credit c
          JOIN artist a ON a.id = c.artist_id
          WHERE c.release_group_id = ${releaseGroup.id} AND c.role = 'primary'
          ORDER BY c.position
          LIMIT 1
        )`,
      })
      .from(userListItem)
      .innerJoin(releaseGroup, eq(releaseGroup.id, userListItem.releaseGroupId))
      .where(
        and(
          inArray(userListItem.listId, listIds),
          sql`not exists (
            select 1 from listen_entry le
            where le.release_group_id = ${releaseGroup.id} and le.user_id = ${trackerId}
          )`,
        ),
      ),
  ]);

  const orderOf = new Map(lists.map((list) => [list.id, list.order]));
  const pendingByList = new Map<string, typeof pendingRows>();
  for (const row of pendingRows) {
    const bucket = pendingByList.get(row.listId) ?? [];
    bucket.push(row);
    pendingByList.set(row.listId, bucket);
  }
  const lastByList = new Map(lastRows.map((row) => [row.listId, row.last]));

  for (const listId of listIds) {
    const pending = pendingByList.get(listId) ?? [];
    const order = orderOf.get(listId);
    pending.sort((a, b) => {
      if (order === "release") {
        // Sin fecha va al final; a igual fecha, el año y el título deciden.
        const da = a.firstReleaseDate ?? (a.year != null ? `${a.year}-12-31` : "9999");
        const db_ = b.firstReleaseDate ?? (b.year != null ? `${b.year}-12-31` : "9999");
        if (da !== db_) return da < db_ ? -1 : 1;
        return a.title.localeCompare(b.title);
      }
      return a.position - b.position;
    });
    const first = pending[0];
    const last = lastByList.get(listId) ?? null;
    result.set(listId, {
      nextUp: first ? { id: first.id, title: first.title, artistName: first.artistName, year: first.year } : null,
      lastListenedAt: last ? new Date(last).toISOString() : null,
    });
  }
  return result;
}
