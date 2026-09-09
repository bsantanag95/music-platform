import type { FeedEntry } from "@/lib/api/schemas";
import { feedEntryTier } from "./feed-entry-tier";

type GroupableEntry =
  | Extract<FeedEntry, { kind: "listen" }>
  | Extract<FeedEntry, { kind: "favorite" }>
  | Extract<FeedEntry, { kind: "rating" }>;

type ListenEntry = Extract<FeedEntry, { kind: "listen" }>;

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

// Síntesis "En rotación" de una corrida de escuchas sin nota, toda del mismo
// objetivo, que acumula suficientes registros en la ventana reciente (openspec:
// add-feed-rotation-peak). Reemplaza a la fila de grupo genérica para esa
// corrida. `count` es la cantidad dentro de la ventana de 7 días.
export interface FeedRotationPeak {
  kind: "rotation-peak";
  id: string;
  target: {
    type: "recording" | "release-group";
    id: string;
    title: string;
    artistName: string | null;
  };
  count: number;
  author: FeedEntry["author"];
  createdAt: string;
}

export type FeedRow = FeedEntry | FeedEntryGroup | FeedRotationPeak;

const GROUP_MIN = 3;

// Pico de rotación: una corrida de escuchas del **mismo objetivo** en los
// últimos 7 días. Umbral más bajo para álbum (repetir un disco completo es
// mucho menos frecuente que repetir un tema). El artista es demasiado grueso
// para "en rotación" — nunca produce pico (mismo criterio que profile-in-rotation).
const ROTATION_PEAK_WINDOW_DAYS = 7;
const ROTATION_PEAK_MIN_SONG = 3;
const ROTATION_PEAK_MIN_ALBUM = 2;

// Candidata a colapsar: tier 2 o 3 (rating, favorito, escucha sin nota). Los
// tier 1 (comentario, nota de escucha, reseña, evento de lista) nunca lo son y
// cortan cualquier corrida.
function isGroupable(entry: FeedEntry): entry is GroupableEntry {
  const tier = feedEntryTier(entry);
  if (tier !== 2 && tier !== 3) return false;
  return entry.kind === "listen" || entry.kind === "favorite" || entry.kind === "rating";
}

// Evalúa si una corrida de escuchas es un pico de rotación: todas del mismo
// objetivo canción/álbum, con la cuenta dentro de la ventana de 7 días >= el
// umbral del tipo. Devuelve `null` si no califica (incluye objetivo artista y
// corridas de objetivos distintos). El pico de álbum puede formarse con solo 2
// entradas, por debajo de `GROUP_MIN` (openspec: add-feed-rotation-peak, D2).
function rotationPeakForRun(run: ListenEntry[], now: Date): FeedRotationPeak | null {
  const first = run[0]!;
  const { id: targetId, type: targetType } = first.target;
  if (targetType !== "recording" && targetType !== "release-group") return null;
  if (!run.every((entry) => entry.target.id === targetId)) return null;

  const cutoff = now.getTime() - ROTATION_PEAK_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const inWindow = run.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff);
  const threshold = targetType === "recording" ? ROTATION_PEAK_MIN_SONG : ROTATION_PEAK_MIN_ALBUM;
  if (inWindow.length < threshold) return null;

  return {
    kind: "rotation-peak",
    id: `peak-${targetType}-${first.id}`,
    target: {
      type: targetType,
      id: targetId,
      title: first.target.title,
      artistName: first.target.artistName ?? null,
    },
    count: inWindow.length,
    author: first.author,
    createdAt: first.createdAt,
  };
}

/**
 * Pliega corridas de entradas consecutivas del **mismo tier** (2 o 3), del
 * **mismo `kind`** y del **mismo autor**. Una entrada de otro tier, otro tipo,
 * otro autor —o cualquier entrada tier 1— corta la corrida.
 *
 * Para una corrida de **escuchas sin nota del mismo objetivo** canción/álbum,
 * si la cuenta dentro de los últimos 7 días alcanza el umbral (canción 3,
 * álbum 2), se emite un `FeedRotationPeak` ("En rotación · Título · N registros
 * esta semana") en vez de la fila de grupo genérica — incluso si la corrida
 * tiene solo 2 entradas (pico de álbum). En cualquier otro caso, una corrida de
 * `GROUP_MIN` o más se pliega en un `FeedEntryGroup` genérico (openspec:
 * rework-feed-tiers + add-feed-rotation-peak).
 *
 * `now` es inyectable para test; en producción es el `useNow()` estable del
 * componente.
 */
export function groupFeedRuns(entries: FeedEntry[], now: Date = new Date()): FeedRow[] {
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

      if (entry.kind === "listen") {
        const peak = rotationPeakForRun(run as ListenEntry[], now);
        if (peak) {
          out.push(peak);
          i = j;
          continue;
        }
      }

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
