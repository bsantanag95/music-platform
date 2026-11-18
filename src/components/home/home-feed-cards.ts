import type {
  FeedAuthor,
  FeedComment,
  FeedEntry,
  FeedFavorite,
  FeedListenEntry,
  FeedRating,
  FeedReview,
} from "@/services/feed/feed";

// Selección de la actividad de quienes sigues para Inicio (openspec: redesign-signed-in-home-phase2):
// las entradas con contenido van en tarjetas y los eventos de poco valor se resumen en una línea por
// persona. Pura y sin dependencias de React, para probarla aparte del render.

/** Varias escuchas seguidas de una misma persona, en una sola tarjeta. */
export interface FeedListenRun {
  kind: "listen-run";
  id: string;
  author: FeedAuthor;
  /** La más reciente de la racha (las entradas vienen ordenadas desc). */
  createdAt: string;
  entries: FeedListenEntry[];
}

export type HomeFeedCard = FeedListenEntry | FeedRating | FeedReview | FeedComment | FeedFavorite | FeedListenRun;

/** Tipos de evento que se resumen; cada uno con su texto (plural) en `home.feedSummary.*`. */
export const SUMMARY_KINDS = [
  "listCreated",
  "listUpdated",
  "caminoCreated",
  "caminoCompleted",
  "collection",
  "wanted",
  "favorite",
  "follow",
  "followArtist",
] as const;
export type SummaryKind = (typeof SUMMARY_KINDS)[number];

export interface FeedSummaryLine {
  author: FeedAuthor;
  /** Cantidad por tipo, en el orden de `SUMMARY_KINDS`; solo los tipos presentes. */
  counts: { kind: SummaryKind; count: number }[];
}

export interface HomeFeedSelection {
  cards: HomeFeedCard[];
  summary: FeedSummaryLine[];
}

type SingleCard = Exclude<HomeFeedCard, FeedListenRun>;

/** Tipo de resumen de una entrada, o `null` si va en tarjeta. */
function summaryKind(entry: FeedEntry): SummaryKind | null {
  switch (entry.kind) {
    case "listen":
    case "rating":
    case "review":
    case "comment":
      return null;
    case "favorite":
      return entry.targetType === "release-group" ? null : "favorite";
    case "list":
      return entry.event === "created" ? "listCreated" : "listUpdated";
    case "camino":
      return entry.event === "created" ? "caminoCreated" : "caminoCompleted";
    case "collection":
      return "collection";
    case "wanted":
      return "wanted";
    case "follow":
      return "follow";
    case "follow-artist":
      return "followArtist";
  }
}

/**
 * Recorre el feed (ordenado del más reciente al más antiguo) hasta llenar `limit` tarjetas. Las
 * escuchas consecutivas de una misma persona —sin otra tarjeta entre ellas; los eventos resumidos no
 * cortan la racha— se unen en una tarjeta de racha. Los eventos de poco valor se agrupan por persona y
 * tipo, solo dentro del tramo que cubren las tarjetas mostradas; las personas, en el orden de su evento
 * más reciente.
 */
export function selectHomeFeedCards(entries: readonly FeedEntry[], limit = 7): HomeFeedSelection {
  const cards: HomeFeedCard[] = [];
  const pendingSummary: { author: FeedAuthor; kind: SummaryKind }[] = [];
  const summarized: { author: FeedAuthor; kind: SummaryKind }[] = [];

  for (const entry of entries) {
    const kind = summaryKind(entry);
    if (kind) {
      pendingSummary.push({ author: entry.author, kind });
      continue;
    }

    const card = entry as SingleCard;
    const last = cards[cards.length - 1];
    if (card.kind === "listen" && last && last.author.id === card.author.id) {
      if (last.kind === "listen-run") {
        last.entries.push(card);
        summarized.push(...pendingSummary.splice(0));
        continue;
      }
      if (last.kind === "listen") {
        cards[cards.length - 1] = {
          kind: "listen-run",
          id: `run-${last.id}`,
          author: last.author,
          createdAt: last.createdAt,
          entries: [last, card],
        };
        summarized.push(...pendingSummary.splice(0));
        continue;
      }
    }

    if (cards.length === limit) break;
    cards.push(card);
    // Los eventos anteriores a esta tarjeta quedan dentro del tramo mostrado.
    summarized.push(...pendingSummary.splice(0));
  }
  // Si el feed se acabó antes de llenar las tarjetas, lo que quedó también está en el tramo.
  if (cards.length < limit) summarized.push(...pendingSummary);

  const byAuthor = new Map<string, FeedSummaryLine>();
  for (const { author, kind } of summarized) {
    let line = byAuthor.get(author.id);
    if (!line) {
      line = { author, counts: [] };
      byAuthor.set(author.id, line);
    }
    const existing = line.counts.find((count) => count.kind === kind);
    if (existing) existing.count += 1;
    else line.counts.push({ kind, count: 1 });
  }
  const summary = [...byAuthor.values()].map((line) => ({
    ...line,
    counts: [...line.counts].sort((a, b) => SUMMARY_KINDS.indexOf(a.kind) - SUMMARY_KINDS.indexOf(b.kind)),
  }));

  return { cards, summary };
}
