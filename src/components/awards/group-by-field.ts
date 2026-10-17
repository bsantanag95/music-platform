// Agrupa las categorías de un nivel por campo (pop, rock-alternative…) conservando el orden curado. Las categorías
// sin campo (niveles general y álbum) quedan en un único grupo sin clave. `validateCategories` garantiza que las
// de un mismo campo son contiguas, así que agrupar por tramos consecutivos basta.

export interface FieldGroup<T> {
  field: string | null;
  items: T[];
}

export function groupByField<T extends { field: string | null }>(items: T[]): FieldGroup<T>[] {
  const groups: FieldGroup<T>[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.field === item.field) last.items.push(item);
    else groups.push({ field: item.field, items: [item] });
  }
  return groups;
}
