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
import { listenEntry, userListItem } from "@/db/schema";

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
