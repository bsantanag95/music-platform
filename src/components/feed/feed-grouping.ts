import type { FeedEntry } from "@/lib/api/schemas";
import { feedEntryTier } from "./feed-entry-tier";

type GroupableEntry =
  | Extract<FeedEntry, { kind: "listen" }>
  | Extract<FeedEntry, { kind: "favorite" }>
  | Extract<FeedEntry, { kind: "rating" }>
  | Extract<FeedEntry, { kind: "follow" }>
  | Extract<FeedEntry, { kind: "follow-artist" }>
  | Extract<FeedEntry, { kind: "collection" }>
  | Extract<FeedEntry, { kind: "wanted" }>;

type ListenEntry = Extract<FeedEntry, { kind: "listen" }>;

export interface FeedEntryGroup {
  kind: "group";
  // Estable para la `key` de React: tipo + id de la primera entrada.
  id: string;
  groupedKind: GroupableEntry["kind"];
  // Tier de la corrida (2 = señal de opinión sobre álbum, 3 = presencia
  // cotidiana, 4 = ambiente/seguir a un usuario). El render puede darle un
  // poco más de peso al grupo tier 2.
  tier: 2 | 3 | 4;
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

type RatingEntry = Extract<FeedEntry, { kind: "rating" }>;
type ReviewEntry = Extract<FeedEntry, { kind: "review" }>;
type CommentEntry = Extract<FeedEntry, { kind: "comment" }>;
type OpinionEntry = RatingEntry | ReviewEntry | CommentEntry;

// Fila fusionada de opinión (openspec: expand-feed-coverage, D6): valoración,
// reseña y/o comentario consecutivos del mismo autor sobre el mismo objetivo,
// a lo sumo uno de cada tipo. Siempre incluye prosa (una valoración no se
// repite por objetivo), así que es tier 1: nunca se pliega y corta corridas.
export interface FeedOpinionRow {
  kind: "opinion";
  id: string;
  author: FeedEntry["author"];
  // La más reciente de las fusionadas (la lista viene ordenada desc).
  createdAt: string;
  target: OpinionEntry["target"];
  rating: RatingEntry | null;
  review: ReviewEntry | null;
  comment: CommentEntry | null;
}

// Fila por persona, disco y día (openspec: redesign-feed-entries, D1): entradas estrictamente contiguas de la misma
// persona sobre el mismo álbum el mismo día calendario, a lo sumo una de cada tipo. Al menos una no es de opinión (si
// no, es una `FeedOpinionRow`). Tier 1 cuando trae prosa; nunca se pliega y corta corridas.
type ListenAlbumEntry = Extract<FeedEntry, { kind: "listen" }>;
type FavoriteEntry = Extract<FeedEntry, { kind: "favorite" }>;
type CollectionEntry = Extract<FeedEntry, { kind: "collection" }>;
type WantedEntry = Extract<FeedEntry, { kind: "wanted" }>;
type AlbumDayEntry =
  | ListenAlbumEntry
  | FavoriteEntry
  | RatingEntry
  | ReviewEntry
  | CommentEntry
  | CollectionEntry
  | WantedEntry;

export interface FeedAlbumDayRow {
  kind: "album-day";
  id: string;
  author: FeedEntry["author"];
  // La más reciente de las fundidas (la lista viene ordenada desc).
  createdAt: string;
  // La primera entrada, para la celda y el título del álbum.
  primary: AlbumDayEntry;
  rating: RatingEntry | null;
  favorite: FavoriteEntry | null;
  listen: ListenAlbumEntry | null;
  collection: CollectionEntry | null;
  wanted: WantedEntry | null;
  review: ReviewEntry | null;
  comment: CommentEntry | null;
}

export type FeedRow = FeedEntry | FeedEntryGroup | FeedRotationPeak | FeedOpinionRow | FeedAlbumDayRow;

export interface GroupFeedOptions {
  // Activa `FeedAlbumDayRow` (solo el feed de seguidos, D1).
  albumDays?: boolean;
  // Zona horaria del día calendario de `albumDays`; sin ella, la del entorno.
  timeZone?: string;
}

const GROUP_MIN = 3;

// Tipos cuya corrida mezcla tiers (openspec: group-mixed-feed-runs, D1): valorar o marcar favoritos seguido se lee
// como una sola cosa aunque alterne álbum (tier 2) con canción o artista (tier 3). El resto exige el mismo tier.
function mixesTiers(kind: FeedEntry["kind"]): boolean {
  return kind === "rating" || kind === "favorite";
}

function isOpinionEntry(entry: FeedEntry): entry is OpinionEntry {
  return entry.kind === "rating" || entry.kind === "review" || entry.kind === "comment";
}

// Fusión de opinión a partir de `entries[start]`: toma las entradas
// estrictamente contiguas del mismo autor y objetivo mientras su tipo no esté
// ya incluido (un segundo comentario corta). Sin reordenar: si otra entrada se
// interpone, no hay fusión. Devuelve `null` si no hay al menos dos.
function opinionRowAt(entries: FeedEntry[], start: number): { row: FeedOpinionRow; end: number } | null {
  const first = entries[start]!;
  if (!isOpinionEntry(first)) return null;

  const picked: Partial<Record<OpinionEntry["kind"], OpinionEntry>> = { [first.kind]: first };
  let end = start + 1;
  while (end < entries.length) {
    const next = entries[end]!;
    if (
      !isOpinionEntry(next) ||
      picked[next.kind] ||
      next.author.id !== first.author.id ||
      next.target.type !== first.target.type ||
      next.target.id !== first.target.id
    ) {
      break;
    }
    picked[next.kind] = next;
    end++;
  }
  if (end - start < 2) return null;

  return {
    row: {
      kind: "opinion",
      id: `opinion-${first.kind}-${first.id}`,
      author: first.author,
      createdAt: first.createdAt,
      target: first.target,
      rating: (picked.rating as RatingEntry | undefined) ?? null,
      review: (picked.review as ReviewEntry | undefined) ?? null,
      comment: (picked.comment as CommentEntry | undefined) ?? null,
    },
    end,
  };
}

// Id del álbum cuando el objetivo de la entrada ES un álbum (no una canción de él).
function albumTargetId(entry: FeedEntry): string | null {
  switch (entry.kind) {
    case "favorite":
      return entry.targetType === "release-group" ? entry.target.id : null;
    case "listen":
    case "rating":
    case "review":
    case "comment":
    case "collection":
    case "wanted":
      return entry.target.type === "release-group" ? entry.target.id : null;
    default:
      return null;
  }
}

function calendarDay(iso: string, timeZone: string | undefined): string {
  // `en-CA` da AAAA-MM-DD, comparable como texto.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

// Fila por persona, disco y día a partir de `entries[start]` (D1). Devuelve `null` si no hay al menos dos entradas o si
// todas son de opinión (eso lo resuelve `opinionRowAt`).
function albumDayRowAt(
  entries: FeedEntry[],
  start: number,
  timeZone: string | undefined,
): { row: FeedAlbumDayRow; end: number } | null {
  const first = entries[start]!;
  const albumId = albumTargetId(first);
  if (!albumId) return null;
  const day = calendarDay(first.createdAt, timeZone);

  const picked: Partial<Record<AlbumDayEntry["kind"], AlbumDayEntry>> = { [first.kind]: first as AlbumDayEntry };
  let end = start + 1;
  while (end < entries.length) {
    const next = entries[end]!;
    if (
      albumTargetId(next) !== albumId ||
      picked[next.kind as AlbumDayEntry["kind"]] ||
      next.author.id !== first.author.id ||
      calendarDay(next.createdAt, timeZone) !== day
    ) {
      break;
    }
    picked[next.kind as AlbumDayEntry["kind"]] = next as AlbumDayEntry;
    end++;
  }
  const kinds = Object.keys(picked) as AlbumDayEntry["kind"][];
  if (kinds.length < 2 || kinds.every((kind) => kind === "rating" || kind === "review" || kind === "comment")) {
    return null;
  }

  return {
    row: {
      kind: "album-day",
      id: `album-day-${first.kind}-${first.id}`,
      author: first.author,
      createdAt: first.createdAt,
      primary: first as AlbumDayEntry,
      rating: (picked.rating as RatingEntry | undefined) ?? null,
      favorite: (picked.favorite as FavoriteEntry | undefined) ?? null,
      listen: (picked.listen as ListenAlbumEntry | undefined) ?? null,
      collection: (picked.collection as CollectionEntry | undefined) ?? null,
      wanted: (picked.wanted as WantedEntry | undefined) ?? null,
      review: (picked.review as ReviewEntry | undefined) ?? null,
      comment: (picked.comment as CommentEntry | undefined) ?? null,
    },
    end,
  };
}

// Álbum de una escucha, favorito o valoración de canción, cuando está
// resuelto (ver `RECORDING_ALBUM_ID_SQL`). `null` para cualquier otro caso
// (otro `kind`, objetivo artista/álbum, o álbum no resuelto).
function albumIdOf(entry: FeedEntry): string | null {
  if (entry.kind === "listen" || entry.kind === "rating" || entry.kind === "favorite") {
    return entry.target.albumId ?? null;
  }
  return null;
}

// Corta la corrida genérica por-tipo en un cambio de álbum CONOCIDO
// (openspec: add-feed-album-sweep) — sin esto, una corrida de canciones de
// dos álbumes distintos que no alcanza el umbral de barrido para ninguno de
// los dos por separado se fundía en un único grupo genérico que no distingue
// álbumes. Sin dato de álbum en cualquiera de las dos entradas (el caso
// común hoy: la mayoría de las corridas no son de canciones, o el álbum no
// está resuelto), no corta nada — se preserva el comportamiento anterior.
function albumBoundary(a: FeedEntry, b: FeedEntry): boolean {
  const albumA = albumIdOf(a);
  const albumB = albumIdOf(b);
  return albumA != null && albumB != null && albumA !== albumB;
}

// Pico de rotación: una corrida de escuchas del **mismo objetivo** en los
// últimos 7 días. Umbral más bajo para álbum (repetir un disco completo es
// mucho menos frecuente que repetir un tema). El artista es demasiado grueso
// para "en rotación" — nunca produce pico (mismo criterio que profile-in-rotation).
const ROTATION_PEAK_WINDOW_DAYS = 7;
const ROTATION_PEAK_MIN_SONG = 3;
const ROTATION_PEAK_MIN_ALBUM = 2;

// Candidata a colapsar: tier 2, 3 (rating, favorito, escucha sin nota, alta de
// colección o de wishlist) o 4 (seguir a un usuario u a un artista, openspec:
// add-feed-kind-differentiation, add-artist-follow-feed-entry). Los tier 1
// (comentario, nota de escucha, reseña, evento de lista o de Camino) nunca lo
// son y cortan cualquier corrida.
function isGroupable(entry: FeedEntry): entry is GroupableEntry {
  const tier = feedEntryTier(entry);
  if (tier !== 2 && tier !== 3 && tier !== 4) return false;
  return (
    entry.kind === "listen" ||
    entry.kind === "favorite" ||
    entry.kind === "rating" ||
    entry.kind === "follow" ||
    entry.kind === "follow-artist" ||
    entry.kind === "collection" ||
    entry.kind === "wanted"
  );
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

type SweepCandidate =
  | Extract<FeedEntry, { kind: "listen" }>
  | Extract<FeedEntry, { kind: "rating" }>
  | Extract<FeedEntry, { kind: "favorite" }>;

// Candidata a un tramo de actividad de álbum (openspec: add-feed-album-sweep):
// escucha, favorito o valoración de una canción con álbum resuelto
// (`target.albumId`, poblado solo por `listFeed` — ver
// `RECORDING_ALBUM_ID_SQL`), que no sea ya una cita tier 1 (una escucha con
// nota nunca es candidata: corta el tramo como cualquier tier 1). Comentarios
// y reseñas quedan afuera a propósito: el caso es "recorrer canción por
// canción" (escuchar, marcar favorito, valorar), no cualquier actividad sobre
// el álbum.
function isAlbumSweepCandidate(entry: FeedEntry): entry is SweepCandidate {
  if (entry.kind !== "listen" && entry.kind !== "rating" && entry.kind !== "favorite") return false;
  if (entry.target.albumId == null) return false;
  return feedEntryTier(entry) !== 1;
}

// ¿`entry` continúa el tramo iniciado por `first`? Mismo autor, mismo álbum —
// el `kind` puede alternar libremente entre escucha, favorito y valoración.
function continuesAlbumSweep(entry: FeedEntry, first: SweepCandidate): entry is SweepCandidate {
  return (
    isAlbumSweepCandidate(entry) &&
    entry.author.id === first.author.id &&
    entry.target.albumId === first.target.albumId
  );
}

// Reparte un tramo de actividad del mismo álbum (escuchas, favoritos y
// valoraciones intercaladas, mismo autor) en hasta un grupo POR TIPO —
// reusando la agrupación genérica ya existente (`FeedEntryGroup`)— en vez de
// exigir que las 3+ entradas del mismo tipo sean estrictamente consecutivas
// en la lista cruda. Esto es lo que permite que "escuchar, favoritear y
// valorar canción por canción" del mismo álbum siga colapsando cada tipo por
// separado ("valoró 6 canciones", "marcó 3 favoritos", "registró 5
// escuchas"), aunque nunca haya dos entradas consecutivas del mismo `kind` en
// la lista cruda — y evita que un favorito de paso (agregado y quitado) le
// robe a una corrida de valoraciones la chance de alcanzar el umbral. Una
// corrida de escuchas del MISMO tema dentro del bucket de escuchas conserva
// prioridad como pico de rotación, igual que en la agrupación genérica. Si
// ningún bucket alcanza `GROUP_MIN`, devuelve el tramo sin tocar (mismo
// resultado que si esta función no existiera).
function albumWindowRows(window: SweepCandidate[], now: Date): FeedRow[] {
  if (window.length < 2) return window;

  const buckets: Record<"rating" | "favorite" | "listen", SweepCandidate[]> = {
    rating: [],
    favorite: [],
    listen: [],
  };
  for (const entry of window) buckets[entry.kind].push(entry);

  const rows: FeedRow[] = [];
  const leftovers: SweepCandidate[] = [];

  for (const kind of ["rating", "favorite", "listen"] as const) {
    const bucket = buckets[kind];
    if (bucket.length === 0) continue;

    if (kind === "listen") {
      const peak = rotationPeakForRun(bucket as ListenEntry[], now);
      if (peak) {
        rows.push(peak);
        continue;
      }
    }

    if (bucket.length >= GROUP_MIN) {
      rows.push({
        kind: "group",
        id: `group-${kind}-${bucket[0]!.id}`,
        groupedKind: kind,
        tier: feedEntryTier(bucket[0]!) as 2 | 3 | 4,
        author: bucket[0]!.author,
        createdAt: bucket[0]!.createdAt,
        entries: bucket as GroupableEntry[],
      });
    } else {
      leftovers.push(...bucket);
    }
  }

  if (rows.length === 0) return window;

  return [...rows, ...leftovers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Pliega corridas de entradas consecutivas del **mismo `kind`** y del **mismo
 * autor** y, salvo valoraciones y favoritos, del **mismo tier** (2 o 3): esos dos
 * mezclan álbum, canción y artista (openspec: group-mixed-feed-runs). Una entrada
 * de otro tipo, otro autor —o cualquier entrada tier 1— corta la corrida.
 *
 * Cuando la entrada es escucha/favorito/valoración de una canción con álbum
 * resuelto (openspec: add-feed-album-sweep), primero se acota el **tramo de
 * álbum**: la corrida más larga de esas tres candidatas del mismo autor sobre
 * el mismo álbum, con `kind` alternando libremente. Ese tramo se reparte por
 * tipo (`albumWindowRows`) y cada tipo se agrupa con el mismo criterio de
 * abajo — así "escuchar, favoritear y valorar" canción por canción sigue
 * colapsando cada tipo por separado aunque nunca haya dos entradas
 * consecutivas del mismo `kind` en la lista cruda. Si ningún tipo alcanza el
 * umbral, el tramo se deja intacto y sigue el camino normal de abajo.
 *
 * Para una corrida de **escuchas sin nota del mismo objetivo** canción/álbum,
 * si la cuenta dentro de los últimos 7 días alcanza el umbral (canción 3,
 * álbum 2), se emite un `FeedRotationPeak` ("En rotación · Título · N registros
 * esta semana") en vez de la fila de grupo genérica — incluso si la corrida
 * tiene solo 2 entradas (pico de álbum). En cualquier otro caso, una corrida de
 * `GROUP_MIN` o más se pliega en un `FeedEntryGroup` genérico (openspec:
 * rework-feed-tiers + add-feed-rotation-peak).
 *
 * Antes que todo lo anterior, una valoración, reseña o comentario seguidos de
 * otra(s) del mismo autor sobre el mismo objetivo se fusionan en una
 * `FeedOpinionRow` (openspec: expand-feed-coverage, D6).
 *
 * Con `options.albumDays` (solo el feed de seguidos), antes que todo se funden las entradas contiguas de la misma
 * persona sobre el mismo álbum el mismo día en una `FeedAlbumDayRow` (openspec: redesign-feed-entries, D1).
 *
 * `now` es inyectable para test; en producción es el `useNow()` estable del
 * componente.
 */
export function groupFeedRuns(entries: FeedEntry[], now: Date = new Date(), options: GroupFeedOptions = {}): FeedRow[] {
  const out: FeedRow[] = [];
  let i = 0;

  while (i < entries.length) {
    const entry = entries[i]!;

    // Antes que la opinión: una fila por persona, disco y día absorbe la valoración, reseña y comentario del mismo
    // disco junto con el resto de lo que hizo ese día (D1).
    const albumDay = options.albumDays ? albumDayRowAt(entries, i, options.timeZone) : null;
    if (albumDay) {
      out.push(albumDay.row);
      i = albumDay.end;
      continue;
    }

    const opinion = opinionRowAt(entries, i);
    if (opinion) {
      out.push(opinion.row);
      i = opinion.end;
      continue;
    }

    if (isAlbumSweepCandidate(entry)) {
      let j = i + 1;
      while (j < entries.length && continuesAlbumSweep(entries[j]!, entry)) j++;

      // Solo vale la pena repartir por tipo si el tramo tiene más de un
      // elemento — con uno solo, dejarlo seguir el camino normal preserva la
      // chance de que igual se agrupe con una entrada siguiente del mismo
      // `kind` que no tenga álbum resuelto (ej. una valoración de artista).
      if (j - i > 1) {
        out.push(...albumWindowRows(entries.slice(i, j) as SweepCandidate[], now));
        i = j;
        continue;
      }
    }

    if (isGroupable(entry)) {
      const tier = feedEntryTier(entry) as 2 | 3 | 4;
      const mixed = mixesTiers(entry.kind);
      let j = i + 1;
      while (
        j < entries.length &&
        isGroupable(entries[j]!) &&
        entries[j]!.kind === entry.kind &&
        (mixed || feedEntryTier(entries[j]!) === tier) &&
        entries[j]!.author.id === entry.author.id &&
        !albumBoundary(entry, entries[j]!) &&
        // Una valoración que abre una fila fusionada de opinión (valoración + reseña o comentario del mismo objetivo)
        // pertenece a esa fila, no a la corrida: al mezclar tiers, una valoración de álbum podía quedar absorbida.
        !opinionRowAt(entries, j)
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
          // En una corrida mixta, el tier más alto (D2): con un álbum dentro, el grupo es señal de opinión.
          tier: Math.min(...run.map((member) => feedEntryTier(member))) as 2 | 3 | 4,
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
