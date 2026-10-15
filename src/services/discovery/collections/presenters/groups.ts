import type { ContextGroup } from "./types";

/**
 * Fuerza que los grupos sean una **partición** de los discos: descarta los ids que no son de la colección y los
 * repetidos, conserva el orden de la lista dentro de cada grupo y manda los discos sin grupo a un último grupo sin
 * encabezado. Un presentador defectuoso nunca esconde un disco.
 */
export function normalizeGroups(albumIds: string[], groups: ContextGroup[]): ContextGroup[] {
  const position = new Map(albumIds.map((id, index) => [id, index]));
  const placed = new Set<string>();
  const result: ContextGroup[] = [];
  for (const group of groups) {
    const ids = [...new Set(group.albumIds)]
      .filter((id) => position.has(id) && !placed.has(id))
      .sort((a, b) => position.get(a)! - position.get(b)!);
    for (const id of ids) placed.add(id);
    if (ids.length > 0) result.push({ ...(group.label ? { label: group.label } : {}), albumIds: ids });
  }
  const rest = albumIds.filter((id) => !placed.has(id));
  if (rest.length > 0) result.push({ albumIds: rest });
  return result;
}
