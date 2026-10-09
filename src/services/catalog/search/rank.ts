// Orden determinista común a los tipos del catálogo (openspec:
// redesign-scoped-search): primero el nivel de coincidencia del tipo, luego
// la actividad en la plataforma, luego lo ya cacheado, y el resto en el orden
// de relevancia de MusicBrainz; lo local que MusicBrainz no devolvió va al
// final de su nivel.
//
// Entre la actividad y lo cacheado entra la notoriedad (`popularity`, p. ej. el
// número de ediciones del álbum en MusicBrainz): con decenas de homónimos que
// MusicBrainz puntúa igual (100), el disco conocido no puede quedar a merced
// de su orden arbitrario.
//
// "Local" no es señal de relevancia: cada búsqueda persiste sus candidatos
// como stub, así que tras unas pocas búsquedas casi todo es local. Ordenar lo
// local antes que MusicBrainz dejaba los homónimos en el orden arbitrario de
// la similitud de la base ("Kiss" de reggae francés antes que KISS).

/** 0 = contenido cacheado, 1 = el resto. */
export type SourceGroup = 0 | 1;

/** Posición de una fila que MusicBrainz no devolvió: detrás de todas las que sí. */
export function localOnlyIndex(localIndex: number): number {
  return 10_000 + localIndex;
}

export interface RankKey {
  /** Nivel de coincidencia del tipo (menor = mejor). */
  level: number;
  /** Actividad en la plataforma (mayor = mejor). */
  activity: number;
  /** Notoriedad fuera de la plataforma (mayor = mejor); ausente = 0. */
  popularity?: number;
  group: SourceGroup;
  /** Orden de relevancia de MusicBrainz (o `localOnlyIndex` si no la devolvió). */
  index: number;
}

export function compareRankKeys(a: RankKey, b: RankKey): number {
  return (
    a.level - b.level ||
    b.activity - a.activity ||
    (b.popularity ?? 0) - (a.popularity ?? 0) ||
    a.group - b.group ||
    a.index - b.index
  );
}

export function sortByRank<T extends { rank: RankKey }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => compareRankKeys(a.rank, b.rank));
}

/** Los artistas más frecuentes (primer aparición desempata), para acotar consultas genéricas. */
export function topArtistNames(names: (string | null)[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const name of names) {
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count], index) => ({ name, count, index }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .slice(0, limit)
    .map(({ name }) => name);
}
