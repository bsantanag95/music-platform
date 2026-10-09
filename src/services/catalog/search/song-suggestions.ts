// Sugerencias del tipo Canciones (openspec: improve-song-suggestions, capacidad search-typeahead).
//
// MusicBrainz guarda cada toma, remaster o directo como una grabación distinta, así que comparar
// solo el título llenaba el desplegable con cinco «One — Metallica». Aquí:
//   - se agrupa por canción (título base + artista principal, el criterio de la búsqueda completa);
//   - si un artista local ocupa un extremo de la consulta, sus canciones que empiezan por el resto
//     van primero ("metallica one");
//   - se ordena por bloques (puente → cubre la consulta → difusa) y, dentro, por palabras de la
//     consulta cubiertas, nivel de coincidencia, actividad, álbumes en que aparece, artista seguido o
//     explorado y similitud.
//
// Solo lecturas locales, con un número fijo de consultas en lote: el desplegable sigue en decenas
// de milisegundos (ver el diseño del cambio para las mediciones).

import type { RecordingRow } from "@/db/schema";
import { activityScores } from "./activity";
import { edgeSplits, restAfterEdgeArtist } from "./coverage";
import {
  findArtistsByKeys,
  matchLocalRecordings,
  recordingSignals,
  recordingsByArtistsAndTitlePrefix,
  shortPrefixRecordings,
} from "./local-match";
import {
  baseSongTitle,
  isShortQuery,
  normalizeSearchText,
  suggestionTier,
  tokenize,
  type MatchTier,
} from "./normalize";

/** Candidatos por título con 3+ caracteres: al agrupar, varias filas colapsan en una. */
const SONG_POOL = 80;
/**
 * Con 2 caracteres, inicio de palabra sobre `search_text` (openspec: speed-up-short-suggestions):
 * los candidatos ya llegan elegidos por señales baratas (empieza por, artista explorado, longitud).
 */
const SHORT_QUERY_POOL = 40;
/** Canciones por artista del puente que se piden antes de agrupar. */
const BRIDGE_POOL = 40;
/** Un resto de una letra recorrería miles de grabaciones de un artista prolífico. */
const MIN_BRIDGE_REST = 2;

export interface SongSuggestionRow {
  id: string;
  title: string;
  artistName: string | null;
}

interface Candidate {
  row: RecordingRow;
  /** Parte de canción de la consulta cuando llegó por el puente; null si llegó por título. */
  bridgeRest: string | null;
  /** Posición en el orden de similitud de la base (desempate final). */
  index: number;
}

/**
 * Palabras de la consulta que están entre las del título o el artista; la última cuenta como
 * prefijo, porque la persona todavía está escribiendo. La sugerencia **cubre** la consulta si las
 * cubre todas.
 */
export function coveredWords(query: string, title: string, artistName: string | null): { covered: number; total: number } {
  const queryWords = tokenize(query);
  const known = [...tokenize(title), ...tokenize(artistName ?? "")];
  const covered = queryWords.filter((word, index) =>
    index === queryWords.length - 1 ? known.some((candidate) => candidate.startsWith(word)) : known.includes(word),
  ).length;
  return { covered, total: queryWords.length };
}

/** Canciones de los artistas locales que ocupan un extremo de la consulta, por prefijo del resto. */
async function bridgeCandidates(text: string): Promise<{ row: RecordingRow; rest: string }[]> {
  const tokens = tokenize(text);
  if (tokens.length < 2) return [];
  const keys = [...new Set(edgeSplits(tokens).map((split) => split.artistTokens.join(" ")))];
  const artists = await findArtistsByKeys(keys);
  const lists = await Promise.all(
    artists.map(async (artist) => {
      const rest = restAfterEdgeArtist(tokens, artist.name)?.join(" ");
      if (!rest || rest.length < MIN_BRIDGE_REST) return [];
      const rows = await recordingsByArtistsAndTitlePrefix([artist.id], rest, BRIDGE_POOL);
      return rows.map((row) => ({ row, rest }));
    }),
  );
  return lists.flat();
}

interface Group {
  members: Candidate[];
  bridgeRest: string | null;
  artistName: string | null;
}

interface RankedGroup {
  representative: RecordingRow;
  artistName: string | null;
  block: 0 | 1 | 2;
  /** Palabras de la consulta cubiertas: ordena las difusas ("oasis wonderw" → antes «Wonderwall» que «I Wonder Why»). */
  covered: number;
  tier: MatchTier;
  activity: number;
  albums: number;
  followers: number;
  explored: boolean;
  index: number;
}

export async function songSuggestions(text: string, limit: number): Promise<SongSuggestionRow[]> {
  const [byTitle, bridged] = await Promise.all([
    isShortQuery(text) ? shortPrefixRecordings(text, SHORT_QUERY_POOL) : matchLocalRecordings(text, SONG_POOL, SONG_POOL),
    bridgeCandidates(text),
  ]);

  const candidates = new Map<string, Candidate>();
  bridged.forEach(({ row, rest }, index) => {
    if (!candidates.has(row.id)) candidates.set(row.id, { row, bridgeRest: rest, index });
  });
  byTitle.forEach((row, index) => {
    if (!candidates.has(row.id)) candidates.set(row.id, { row, bridgeRest: null, index: bridged.length + index });
  });
  if (candidates.size === 0) return [];

  const ids = [...candidates.keys()];
  const [signals, activity] = await Promise.all([recordingSignals(ids), activityScores("recording", ids)]);

  // Agrupación por canción: título base + artista principal.
  const groups = new Map<string, Group>();
  for (const candidate of candidates.values()) {
    const artistName = signals.artistByRecording.get(candidate.row.id)?.name ?? null;
    const key = `${normalizeSearchText(baseSongTitle(candidate.row.title))}|${normalizeSearchText(artistName ?? "")}`;
    const group = groups.get(key) ?? { members: [], bridgeRest: null, artistName };
    group.members.push(candidate);
    group.bridgeRest ??= candidate.bridgeRest;
    groups.set(key, group);
  }

  const albumsOf = (row: RecordingRow) => signals.albumsByRecording.get(row.id) ?? 0;
  const ranked: RankedGroup[] = [...groups.values()].map((group) => {
    const songPart = group.bridgeRest ?? text;
    // Con 2 letras, palabra completa y prefijo cuentan igual: «On the Floor» no es mejor que «One».
    const tierOf = (row: RecordingRow) => suggestionTier(baseSongTitle(row.title), songPart);
    // Representante: la versión que aparece en más álbumes (la canónica), luego la mejor coincidencia.
    const representative = [...group.members].sort(
      (a, b) => albumsOf(b.row) - albumsOf(a.row) || tierOf(a.row) - tierOf(b.row) || a.index - b.index,
    )[0]!.row;
    const artist = signals.artistByRecording.get(representative.id);
    const { covered, total } = coveredWords(text, representative.title, group.artistName);
    const block = group.bridgeRest !== null ? 0 : total > 0 && covered === total ? 1 : 2;
    return {
      representative,
      artistName: group.artistName,
      block,
      covered,
      tier: Math.min(...group.members.map((member) => tierOf(member.row))) as MatchTier,
      activity: group.members.reduce((sum, member) => sum + (activity.get(member.row.id) ?? 0), 0),
      albums: Math.max(...group.members.map((member) => albumsOf(member.row))),
      followers: artist ? (signals.followersByArtist.get(artist.id) ?? 0) : 0,
      explored: artist?.explored ?? false,
      index: Math.min(...group.members.map((member) => member.index)),
    };
  });

  ranked.sort(
    (a, b) =>
      a.block - b.block ||
      b.covered - a.covered ||
      a.tier - b.tier ||
      b.activity - a.activity ||
      b.albums - a.albums ||
      b.followers - a.followers ||
      Number(b.explored) - Number(a.explored) ||
      a.index - b.index,
  );

  return ranked.slice(0, limit).map((group) => ({
    id: group.representative.id,
    title: group.representative.title,
    artistName: group.artistName,
  }));
}
