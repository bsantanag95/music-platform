// Helpers puros de reordenamiento de ítems de una lista. Todas las afordancias
// de los tres modos (↑/↓, "al principio/al final", barra del modo Gráfico)
// producen el array completo de ids en el nuevo orden y llaman a la misma
// operación de servidor (`reorderListItems`).

/** Mueve el ítem `id` `delta` posiciones (−1 arriba, +1 abajo). */
export function moveByOffset(order: string[], id: string, delta: -1 | 1): string[] {
  const index = order.indexOf(id);
  if (index < 0) return order;
  const target = index + delta;
  if (target < 0 || target >= order.length) return order;
  const next = [...order];
  const [moved] = next.splice(index, 1);
  if (moved === undefined) return order;
  next.splice(target, 0, moved);
  return next;
}

/** Lleva el ítem `id` al principio o al final de la lista. */
export function moveToEdge(order: string[], id: string, edge: "start" | "end"): string[] {
  const index = order.indexOf(id);
  if (index < 0) return order;
  const next = [...order];
  const [moved] = next.splice(index, 1);
  if (moved === undefined) return order;
  if (edge === "start") next.unshift(moved);
  else next.push(moved);
  return next;
}
