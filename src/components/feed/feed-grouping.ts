import type { FeedEntry } from "@/lib/api/schemas";
import { feedEntryTier } from "./feed-entry-tier";

type GroupableEntry =
  | Extract<FeedEntry, { kind: "listen" }>
  | Extract<FeedEntry, { kind: "favorite" }>
  | Extract<FeedEntry, { kind: "rating" }>;

export interface FeedEntryGroup {
  kind: "group";
  // Estable para la `key` de React: tipo + id de la primera entrada.
  id: string;
  groupedKind: "listen" | "favorite" | "rating";
  // Tier de la corrida (2 = señal de opinión sobre álbum, 3 = presencia
  // cotidiana). El render puede darle un poco más de peso al grupo tier 2.
  tier: 2 | 3;
  author: FeedEntry["author"];
  // El más reciente de la corrida (las entradas vienen ordenadas desc).
  createdAt: string;
  entries: GroupableEntry[];
}

export type FeedRow = FeedEntry | FeedEntryGroup;

const GROUP_MIN = 3;

// Candidata a colapsar: tier 2 o 3 (rating, favorito, escucha sin nota). Los
// tier 1 (comentario, nota de escucha, reseña, evento de lista) nunca lo son y
// cortan cualquier corrida.
function isGroupable(entry: FeedEntry): entry is GroupableEntry {
  const tier = feedEntryTier(entry);
  if (tier !== 2 && tier !== 3) return false;
  return entry.kind === "listen" || entry.kind === "favorite" || entry.kind === "rating";
}

/**
 * Pliega corridas de 3 o más entradas consecutivas del **mismo tier** (2 o 3),
 * del **mismo `kind`** y del **mismo autor** en una única fila. Una entrada de
 * otro tier, otro tipo, otro autor —o cualquier entrada tier 1— corta la
 * corrida. Así una racha de ratings de canción (tier 3) se colapsa pero dos
 * ratings de álbum sueltos (tier 2) no, y las dos rachas no se fusionan entre
 * sí (openspec: rework-feed-tiers).
 */
export function groupFeedRuns(entries: FeedEntry[]): FeedRow[] {
  const out: FeedRow[] = [];
  let i = 0;

  while (i < entries.length) {
    const entry = entries[i]!;

    if (isGroupable(entry)) {
      const tier = feedEntryTier(entry) as 2 | 3;
      let j = i + 1;
      while (
        j < entries.length &&
        isGroupable(entries[j]!) &&
        entries[j]!.kind === entry.kind &&
        feedEntryTier(entries[j]!) === tier &&
        entries[j]!.author.id === entry.author.id
      ) {
        j++;
      }

      const run = entries.slice(i, j) as GroupableEntry[];
      if (run.length >= GROUP_MIN) {
        out.push({
          kind: "group",
          id: `group-${entry.kind}-${run[0]!.id}`,
          groupedKind: entry.kind,
          tier,
          author: entry.author,
          createdAt: run[0]!.createdAt,
          entries: run,
        });
        i = j;
        continue;
      }
    }

    out.push(entry);
    i++;
  }

  return out;
}
