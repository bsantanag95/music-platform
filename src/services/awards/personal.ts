import { getDiscographyMarks } from "@/services/catalog/artist-discography-view";
import type { RecentHeadlineWinner } from "./read";

// Tu relación con los premios (openspec: add-awards-personal-progress): cuántos de los álbumes ganadores recientes escuchó
// la persona que mira el hub. Solo se calcula con sesión y solo se le muestra a ella; nunca se expone a otras personas.
//
// «Escuchado» es una señal explícita suya sobre el álbum: registró una escucha o lo valoró (valorar implica haberlo
// escuchado). Tenerlo en Pendiente no cuenta como escuchado: se marca aparte.

export interface WinnerMarks {
  /** Álbumes ganadores que la persona escuchó o valoró. */
  heard: Set<string>;
  /** Álbumes ganadores que tiene en Pendiente y todavía no escuchó. */
  pending: Set<string>;
}

/** Álbumes distintos del muro de ganadores recientes (un mismo disco puede ganar en varios premios), en orden de aparición. */
export function winnerAlbumIds(winners: RecentHeadlineWinner[]): string[] {
  const ids = new Set<string>();
  for (const entry of winners) {
    const subject = entry.winner.subject;
    if (subject?.kind === "release_group") ids.add(subject.album.id);
  }
  return [...ids];
}

/** Marcas de la persona sobre los álbumes ganadores, con las consultas por lote de la discografía (una por tabla). */
export async function getWinnerMarks(userId: string, albumIds: string[]): Promise<WinnerMarks> {
  const marks = await getDiscographyMarks(userId, albumIds);
  const heard = new Set([...marks.listened, ...Object.keys(marks.stars)]);
  return { heard, pending: new Set(marks.pending.filter((id) => !heard.has(id))) };
}

/**
 * Los ganadores que le faltan a la persona: los que tienen álbum en el catálogo y no escuchó, una sola vez por álbum (el
 * filtro es una lista de lo que queda por escuchar; repetir un disco que ganó en tres premios no ayuda). Los ganadores sin
 * álbum en el catálogo no entran: no hay nada que marcar como escuchado.
 */
export function missingWinners(winners: RecentHeadlineWinner[], heard: Set<string>): RecentHeadlineWinner[] {
  const seen = new Set<string>();
  return winners.filter((entry) => {
    const subject = entry.winner.subject;
    if (subject?.kind !== "release_group") return false;
    const id = subject.album.id;
    if (heard.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
