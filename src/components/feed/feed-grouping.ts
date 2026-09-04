import type { FeedEntry } from "@/lib/api/schemas";
import { isFeedEntryWithText } from "./feed-entry-weight";

type AmbientEntry =
  | Extract<FeedEntry, { kind: "listen" }>
  | Extract<FeedEntry, { kind: "favorite" }>;

export interface FeedEntryGroup {
  kind: "group";
  // Estable para la `key` de React: tipo + id de la primera entrada.
  id: string;
  groupedKind: "listen" | "favorite";
  author: FeedEntry["author"];
  // El más reciente de la corrida (las entradas vienen ordenadas desc).
  createdAt: string;
  entries: AmbientEntry[];
}

export type FeedRow = FeedEntry | FeedEntryGroup;

const GROUP_MIN = 3;

// Candidata a colapsar: sola presencia de bajo contenido — escucha sin nota, o
// favorito. Un comentario o una escucha con nota nunca lo son.
function isAmbient(entry: FeedEntry): entry is AmbientEntry {
  if (isFeedEntryWithText(entry)) return false;
  return entry.kind === "listen" || entry.kind === "favorite";
}

/**
 * Pliega corridas de 3 o más entradas consecutivas de sola presencia del mismo
 * tipo (escuchas sin nota, o favoritos) y del mismo autor en una única fila.
 * Comentarios, ratings, eventos de lista y escuchas con nota cortan la corrida
 * y nunca se colapsan. Ver openspec/changes/redesign-feed, decisión 11.
 */
export function groupAmbientRuns(entries: FeedEntry[]): FeedRow[] {
  const out: FeedRow[] = [];
  let i = 0;

  while (i < entries.length) {
    const entry = entries[i]!;

    if (isAmbient(entry)) {
      let j = i + 1;
      while (
        j < entries.length &&
        isAmbient(entries[j]!) &&
        entries[j]!.kind === entry.kind &&
        entries[j]!.author.id === entry.author.id
      ) {
        j++;
      }

      const run = entries.slice(i, j) as AmbientEntry[];
      if (run.length >= GROUP_MIN) {
        out.push({
          kind: "group",
          id: `group-${entry.kind}-${run[0]!.id}`,
          groupedKind: entry.kind,
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
