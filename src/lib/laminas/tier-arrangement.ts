import { TIER_COUNT } from "./tiers";

// Disposición de una tier list en el editor (spec tier-laminas): seis niveles y la bandeja, como ids de ítem. Funciones puras: el editor
// las aplica al instante y manda el resultado completo a `PUT /api/me/cards/<id>/tiers`.

export interface TierArrangement {
  tiers: string[][];
  tray: string[];
}

/** Grupo de la bandeja: después de los seis niveles. */
export const TRAY_GROUP = TIER_COUNT;

function groups(arrangement: TierArrangement): string[][] {
  return [...arrangement.tiers.map((ids) => [...ids]), [...arrangement.tray]];
}

function fromGroups(all: string[][]): TierArrangement {
  return { tiers: all.slice(0, TIER_COUNT), tray: all[TRAY_GROUP] ?? [] };
}

export function locateItem(arrangement: TierArrangement, itemId: string): { group: number; index: number } | null {
  const all = groups(arrangement);
  for (const [group, ids] of all.entries()) {
    const index = ids.indexOf(itemId);
    if (index >= 0) return { group, index };
  }
  return null;
}

/** Mueve un ítem a un grupo, antes de `beforeId` si está en ese grupo; si no, al final. */
export function moveItem(arrangement: TierArrangement, itemId: string, group: number, beforeId: string | null = null): TierArrangement {
  if (itemId === beforeId) return arrangement;
  const from = locateItem(arrangement, itemId);
  if (!from || group < 0 || group > TRAY_GROUP) return arrangement;
  const all = groups(arrangement);
  all[from.group]!.splice(from.index, 1);
  const target = all[group]!;
  const at = beforeId ? target.indexOf(beforeId) : -1;
  target.splice(at >= 0 ? at : target.length, 0, itemId);
  return fromGroups(all);
}

/** Corre un ítem un lugar dentro de su grupo (`-1` a la izquierda, `1` a la derecha). Sin lugar, no cambia nada. */
export function shiftItem(arrangement: TierArrangement, itemId: string, delta: -1 | 1): TierArrangement {
  const from = locateItem(arrangement, itemId);
  if (!from) return arrangement;
  const all = groups(arrangement);
  const ids = all[from.group]!;
  const to = from.index + delta;
  if (to < 0 || to >= ids.length) return arrangement;
  [ids[from.index], ids[to]] = [ids[to]!, ids[from.index]!];
  return fromGroups(all);
}

export function removeFromArrangement(arrangement: TierArrangement, itemId: string): TierArrangement {
  return fromGroups(groups(arrangement).map((ids) => ids.filter((id) => id !== itemId)));
}
