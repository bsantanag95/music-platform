import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { userList } from "@/db/schema";
import { countTrackedLists } from "@/services/lists/saved-lists";

export interface ProgressTabCounts {
  discographies: number;
  lists: number;
  following: number;
}

/**
 * Totales de las tres pestañas de /me/progress (openspec: redesign-progress-toolbar, D3): la página solo carga el
 * listado de la pestaña activa, pero las tres muestran su total. Recorridos y Caminos salen de una consulta agrupada por
 * `kind`; las listas seguidas, de `countTrackedLists`.
 */
export async function countProgressTabs(userId: string): Promise<ProgressTabCounts> {
  const [rows, following] = await Promise.all([
    db
      .select({ kind: userList.kind, n: count() })
      .from(userList)
      .where(and(eq(userList.ownerId, userId), inArray(userList.kind, ["artist_journey", "custom_journey"])))
      .groupBy(userList.kind),
    countTrackedLists(userId),
  ]);
  const byKind = new Map(rows.map((row) => [row.kind, Number(row.n)]));
  return {
    discographies: byKind.get("artist_journey") ?? 0,
    lists: byKind.get("custom_journey") ?? 0,
    following,
  };
}
