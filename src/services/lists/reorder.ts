// Reordenamiento de los ítems de una lista en una sola sentencia: `UPDATE … FROM (VALUES …)` con la posición (y, en una
// tier list, el nivel) de cada ítem. Una lista larga no hace un UPDATE por ítem: el orden nuevo llega a la base en un
// viaje, sea cual sea su tamaño. La unicidad `(list_id, position)` es diferible (migración 0010), así que el intercambio
// de posiciones dentro de la sentencia no choca.

import { sql, type SQL } from "drizzle-orm";
import type { db } from "@/db";

type Executor = Pick<typeof db, "execute">;

export interface ItemPlacement {
  itemId: string;
  position: number;
  /** Solo en una tier list: nivel 0..n o `null` (la bandeja). Si se omite en todos, el nivel no se toca. */
  tier?: number | null;
}

/** Fila `(id, position[, tier])` de la tabla de valores; los tipos van explícitos para que Postgres no los infiera. */
function valuesRow(placement: ItemPlacement, withTier: boolean): SQL {
  return withTier
    ? sql`(${placement.itemId}::uuid, ${placement.position}::int, ${placement.tier ?? null}::smallint)`
    : sql`(${placement.itemId}::uuid, ${placement.position}::int)`;
}

/**
 * Fija la posición (y el nivel, si se da en algún ítem) de los ítems de `listId`. Un id que no pertenece a la lista no
 * se toca: la condición `list_id` va en el `WHERE`, igual que en el UPDATE por ítem al que reemplaza.
 */
export async function applyItemPlacements(executor: Executor, listId: string, placements: readonly ItemPlacement[]): Promise<void> {
  if (placements.length === 0) return;
  const withTier = placements.some((placement) => placement.tier !== undefined);
  const values = sql.join(
    placements.map((placement) => valuesRow(placement, withTier)),
    sql`, `,
  );
  await executor.execute(
    withTier
      ? sql`UPDATE user_list_item AS item
          SET position = placed.position, tier = placed.tier
          FROM (VALUES ${values}) AS placed (id, position, tier)
          WHERE item.list_id = ${listId}::uuid AND item.id = placed.id`
      : sql`UPDATE user_list_item AS item
          SET position = placed.position
          FROM (VALUES ${values}) AS placed (id, position)
          WHERE item.list_id = ${listId}::uuid AND item.id = placed.id`,
  );
}
