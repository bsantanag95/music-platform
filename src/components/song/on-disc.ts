// Ventana de la columna «En el disco» (openspec: modernize-song-page-phase2): hasta `ON_DISC_MAX` pistas se ven todas; con más,
// las `ON_DISC_AROUND` anteriores y siguientes a la actual, completando la ventana en los extremos del disco. Funciones puras.

export const ON_DISC_MAX = 20;
export const ON_DISC_AROUND = 5;

/** Rango `[start, end)` de pistas a mostrar para la pista `index` (0-based) de un disco de `total` pistas. */
export function onDiscRange(total: number, index: number): { start: number; end: number } {
  if (total <= ON_DISC_MAX) return { start: 0, end: total };
  const size = ON_DISC_AROUND * 2 + 1;
  const start = Math.min(Math.max(index - ON_DISC_AROUND, 0), total - size);
  return { start, end: start + size };
}

/** Duración total: la suma de las conocidas y si falta alguna; `null` si no se conoce ninguna. */
export function onDiscTotal(durations: (number | null | undefined)[]): { seconds: number; approximate: boolean } | null {
  const known = durations.filter((d): d is number => typeof d === "number");
  if (known.length === 0) return null;
  return { seconds: known.reduce((sum, d) => sum + d, 0), approximate: known.length < durations.length };
}
