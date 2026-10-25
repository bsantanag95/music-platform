// Escalas de hitos de notificación (openspec:
// add-notification-milestones-and-releases, D2 y D3).
//
// Funciones puras: la emisión (`emit.ts`) y sus fuentes solo preguntan cuál es
// el hito más alto alcanzado. La escala de likes empieza en 10 y no en el
// umbral público de 3 (`add-comment-likes`): 3 es cuándo se muestra la cifra,
// no cuándo vale la pena interrumpir. La de guardados empieza en 1 porque una
// lista guardada es mucho más rara que un like.

/** Escala de hitos: los primeros valores sueltos y luego un paso constante. */
export interface MilestoneScale {
  readonly values: readonly number[];
  /** A partir del último valor suelto, se avisa cada `step`. */
  readonly step: number;
}

export const COMMENT_LIKE_MILESTONES: MilestoneScale = {
  values: [10, 25, 50, 100, 500, 1000, 2500, 5000, 10000],
  step: 10000,
};

export const LIST_SAVE_MILESTONES: MilestoneScale = {
  values: [1, 5, 10, 25, 50, 100, 500, 1000],
  step: 1000,
};

/**
 * Hito más alto alcanzado por `count`, o `null` si todavía no llega al primero.
 * Si un conteo salta varios hitos de golpe devuelve solo el más alto: el aviso
 * de 9 → 30 likes es 25, no 10 y 25 (D3).
 */
export function highestMilestone(scale: MilestoneScale, count: number): number | null {
  if (!Number.isFinite(count) || count < 1) return null;

  let highest: number | null = null;
  for (const value of scale.values) {
    if (value > count) break;
    highest = value;
  }

  const last = scale.values[scale.values.length - 1];
  if (last !== undefined && count > last && scale.step > 0) {
    highest = Math.floor(count / scale.step) * scale.step;
  }

  return highest;
}

/**
 * Hito que cruza la interacción que acaba de llevar el conteo a `count`, o `null` si no cruzó
 * ninguno. Solo avisa lo que esta interacción alcanzó: un comentario que ya tenía 15 likes
 * antes de que existieran los hitos (o cuando la persona los tenía apagados) no avisa 10 con
 * el siguiente like; su próximo aviso es el 25.
 */
export function crossedMilestone(scale: MilestoneScale, count: number): number | null {
  const reached = highestMilestone(scale, count);
  return reached !== null && reached !== highestMilestone(scale, count - 1) ? reached : null;
}
