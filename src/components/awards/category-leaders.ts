import type { CategoryHistoryEntry, NominationView } from "@/services/awards/read";

// "Los más nominados" del historial de una categoría (openspec: redesign-category-history): quién se repite en la categoría a
// lo largo de las ceremonias, con sus nominaciones y victorias. Se calcula con los mismos datos que ya carga la página, sin
// consultas nuevas.

export interface CategoryLeader {
  name: string;
  nominations: number;
  wins: number;
}

/** Mínimo de nominaciones para figurar: con una sola, la lista sería la categoría entera. */
export const CATEGORY_LEADERS_MIN_NOMINATIONS = 2;

/**
 * A quién se atribuye una nominación: el artista nominado, o el artista principal del álbum o la grabación; sin sujeto del
 * catálogo, el crédito curado. Sin nada de eso (un nominado solo texto y sin crédito) no se atribuye.
 */
export function nomineeArtist(nomination: NominationView): string | null {
  const subject = nomination.subject;
  if (subject?.kind === "artist") return subject.name;
  if (subject?.kind === "release_group") return subject.album.artistName;
  if (subject?.kind === "recording") return subject.artistName;
  return nomination.credit;
}

/**
 * Artistas con al menos `CATEGORY_LEADERS_MIN_NOMINATIONS` nominaciones en la categoría (las victorias cuentan como
 * nominación), por nominaciones, luego victorias, luego nombre; hasta `limit`.
 */
export function categoryLeaders(entries: CategoryHistoryEntry[], limit = 8): CategoryLeader[] {
  const byName = new Map<string, CategoryLeader>();
  for (const entry of entries) {
    for (const nomination of entry.nominations) {
      const name = nomineeArtist(nomination)?.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      const leader = byName.get(key) ?? { name, nominations: 0, wins: 0 };
      leader.nominations += 1;
      if (nomination.won) leader.wins += 1;
      byName.set(key, leader);
    }
  }
  return [...byName.values()]
    .filter((leader) => leader.nominations >= CATEGORY_LEADERS_MIN_NOMINATIONS)
    .sort((a, b) => b.nominations - a.nominations || b.wins - a.wins || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Ancla de un año en la página del historial. */
export function historyYearAnchor(year: number): string {
  return `anio-${year}`;
}
