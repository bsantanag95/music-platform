import type { OwnStateFilter } from "./progress-tabs";

interface Progress {
  selectedCount: number;
  listenedCount: number;
}

/** Proporción escuchada de la selección; una selección vacía cuenta como 0. Nunca se muestra como número (§6.4.1). */
export function progressRatio(progress: Progress): number {
  return progress.selectedCount > 0 ? progress.listenedCount / progress.selectedCount : 0;
}

/**
 * Orden "Más avanzadas" (openspec: redesign-progress-toolbar, D6): mayor proporción escuchada primero. `sort` es estable,
 * así que los empates conservan el orden de agregado con que llega el listado.
 */
export function sortByProgress<T extends { progress: Progress }>(items: T[]): T[] {
  return [...items].sort((a, b) => progressRatio(b.progress) - progressRatio(a.progress));
}

/** Cantidad de entradas por estado para los segmentos (D5); `all` es el total. */
export function countByState(items: { state: Exclude<OwnStateFilter, "all"> }[]): Record<OwnStateFilter, number> {
  const counts: Record<OwnStateFilter, number> = { all: items.length, in_progress: 0, complete: 0, archived: 0 };
  for (const item of items) counts[item.state] += 1;
  return counts;
}
