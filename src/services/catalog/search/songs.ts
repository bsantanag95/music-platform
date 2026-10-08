// Búsqueda del tipo Canciones (openspec: redesign-scoped-search, capacidades
// search-query-matching y catalog-search; antes "songContext" de
// add-recording-album-search).
//
// La canción no tiene página propia desde la búsqueda: el resultado es la
// canción (título, artista) con los álbumes que la contienen. Diferencias con
// la versión anterior:
//   - solo corre en el tipo Canciones (buscar un artista ya no la dispara);
//   - el artista se detecta SOLO en un extremo de la consulta y se elige por
//     relevancia, no por longitud del nombre ("dokken kiss of death" elegía a
//     la banda tributo "Kiss of Death" por tener el nombre más largo);
//   - se prueban como máximo dos interpretaciones, y la usada se devuelve
//     para que la página la muestre y ofrezca la alternativa;
//   - los resultados se agrupan por (canción, artista): la unión de
//     apariciones es DENTRO del grupo, nunca entre artistas distintos.
//
// Presupuesto de MusicBrainz: una búsqueda de artistas; por interpretación,
// un browse de discografía (solo sin créditos locales) y una búsqueda de
// recordings; y hasta cuatro browse de apariciones del primer grupo.

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { credit, recording, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { musicbrainz } from "../../musicbrainz/client";
import { mapReleaseGroupCategory } from "../../musicbrainz/mappers";
import type { MBArtistSearchItem, MBRecordingSearchItem } from "../../musicbrainz/types";
import type { ReleaseGroupCategoryValue } from "../ingest-release-group";
import {
  albumsFromMbReleases,
  findOrIngestRecording,
  localAppearanceAlbums,
  localRecordingArtistName,
  sortSongContextAlbums,
  type SongContextAlbum,
} from "../ingest-recording";
import { activityScores } from "./activity";
import { coverageLevel, edgeSplits, restAfterEdgeArtist } from "./coverage";
import { findArtistsByKeys, matchLocalRecordings } from "./local-match";
import { artistQuery, escapeLucenePhrase, recordingFieldQuery, recordingFreeQuery } from "./mb-query";
import { baseSongTitle, normalizeSearchText, splitExplicit, tokenize, withoutSeparator } from "./normalize";
import type { SearchPurpose } from "./params";
import { sortByRank, topArtistNames, type RankKey } from "./rank";
import {
  GENERIC_QUERY_THRESHOLD,
  REFINE_ARTIST_LIMIT,
  type SongAlbum,
  type SongAlternative,
  type SongGroupResult,
  type SongSearchResponse,
} from "./types";

const SONG_ALBUM_LIMIT = 12;
const LOCAL_RECORDING_LIMIT = 10;
/** Interpretaciones (y búsquedas de recordings) como máximo por búsqueda. */
const MAX_ATTEMPTS = 2;
// Versiones de la misma canción que se browséan y se unen: MB fragmenta una
// canción en tomas de estudio, lives, remixes y malvinculaciones, y ninguna
// grabación individual tiene todas las apariciones.
const CANDIDATE_BROWSE_LIMIT = 4;
const RGID_CLAUSE_LIMIT = 120;
/** Grupos que devuelve el modo de elección, cada uno con su grabación identidad. */
export const PICK_GROUP_LIMIT = 10;

const SONG_RG_CATEGORY_ORDER: Record<ReleaseGroupCategoryValue, number> = {
  studio: 0,
  single_ep: 1,
  compilation: 2,
  live_other: 3,
};

// ---------- Interpretaciones "canción X de artista Y"

export interface ArtistCandidate {
  name: string;
  mbid: string | null;
  localId: string | null;
  /** Score de MusicBrainz para la consulta (0 si solo es local). */
  score: number;
  activity: number;
}

export interface Interpretation {
  /** Parte de canción, normalizada. */
  songPart: string;
  artist: ArtistCandidate | null;
  /** Nombre del artista tal como lo escribió la persona (separador explícito sin entidad). */
  artistName: string | null;
}

/**
 * Candidatos de artista: locales con nombre exacto igual a un extremo de la
 * consulta, más los de la búsqueda de artistas de MusicBrainz. Deduplicados
 * por mbid (o id local) conservando score y actividad.
 */
async function artistCandidates(text: string, localOnly: boolean, signal?: AbortSignal): Promise<{
  candidates: ArtistCandidate[];
  remoteFailed: boolean;
}> {
  const tokens = tokenize(text);
  const keys = [...new Set(edgeSplits(tokens).map((split) => split.artistTokens.join(" ")))];
  const [localRows, remoteResult] = await Promise.all([
    findArtistsByKeys(keys),
    (localOnly
      ? Promise.resolve({ artists: [] as MBArtistSearchItem[] })
      : musicbrainz.searchArtist(artistQuery(text), { signal }))
      .then((response) => ({ ok: true as const, artists: response.artists }))
      .catch(() => ({ ok: false as const, artists: [] as MBArtistSearchItem[] })),
  ]);

  const byKey = new Map<string, ArtistCandidate>();
  for (const row of localRows) {
    byKey.set(row.mbid ?? row.id, {
      name: row.name,
      mbid: row.mbid,
      localId: row.id,
      score: 0,
      activity: 0,
    });
  }
  for (const item of remoteResult.artists) {
    const known = byKey.get(item.id);
    if (known) {
      known.score = Math.max(known.score, item.score ?? 0);
      continue;
    }
    byKey.set(item.id, { name: item.name, mbid: item.id, localId: null, score: item.score ?? 0, activity: 0 });
  }

  const candidates = [...byKey.values()];
  const localIds = candidates.map((candidate) => candidate.localId).filter((id) => id !== null);
  const activity = await activityScores("artist", localIds);
  for (const candidate of candidates) {
    candidate.activity = candidate.localId ? activity.get(candidate.localId) ?? 0 : 0;
  }
  return { candidates, remoteFailed: !remoteResult.ok };
}

/**
 * Interpretaciones ordenadas por relevancia. Un artista solo califica si su
 * nombre ocupa el INICIO o el FINAL de la consulta en límite de palabra y
 * deja una canción de al menos 2 caracteres. Se ordena por actividad y luego
 * por score de MusicBrainz — nunca por longitud del nombre.
 */
export function rankInterpretations(query: string, candidates: ArtistCandidate[]): Interpretation[] {
  const explicit = splitExplicit(query);
  const byName = new Map<string, Interpretation & { candidate: ArtistCandidate | null }>();

  if (explicit) {
    // "Artista - Canción" o "Canción - Artista": los dos órdenes, el escrito primero.
    for (const [artistSide, songSide] of [
      [explicit.left, explicit.right],
      [explicit.right, explicit.left],
    ] as const) {
      const key = normalizeSearchText(artistSide);
      const candidate =
        [...candidates]
          .filter((item) => normalizeSearchText(item.name) === key)
          .sort((a, b) => b.activity - a.activity || b.score - a.score)[0] ?? null;
      if (!byName.has(key)) {
        byName.set(key, {
          songPart: normalizeSearchText(songSide),
          artist: candidate,
          artistName: candidate?.name ?? artistSide.trim(),
          candidate,
        });
      }
    }
    return [...byName.values()];
  }

  const tokens = tokenize(query);
  const qualified = candidates
    .map((candidate) => ({ candidate, rest: restAfterEdgeArtist(tokens, candidate.name) }))
    .filter(({ rest }) => rest !== null && rest.join(" ").length >= 2)
    .sort((a, b) => b.candidate.activity - a.candidate.activity || b.candidate.score - a.candidate.score);

  for (const { candidate, rest } of qualified) {
    const key = normalizeSearchText(candidate.name);
    if (byName.has(key)) continue;
    byName.set(key, {
      songPart: rest!.join(" "),
      artist: candidate,
      artistName: candidate.name,
      candidate,
    });
  }
  return [...byName.values()];
}

/** Score mínimo de MusicBrainz para ofrecer una interpretación como alternativa. */
const ALTERNATIVE_MIN_SCORE = 80;

function isPlausibleAlternative(interpretation: Interpretation): boolean {
  const artist = interpretation.artist;
  if (!artist) return true; // separador explícito: la persona escribió ese artista
  return artist.activity > 0 || artist.score >= ALTERNATIVE_MIN_SCORE;
}

// ---------- Filtro de relevancia y consulta de recordings

/**
 * El título de la grabación está contenido en la parte de canción, o
 * viceversa tolerando como máximo 2 tokens extra en el título: sin eso,
 * "sabrina carpenter - taste (dudda bootleg)" pasaría por "taste".
 */
export function isRelevantRecordingTitle(songPart: string, title: string): boolean {
  const normalizedPart = normalizeSearchText(songPart);
  const normalizedTitle = normalizeSearchText(title);
  if (!normalizedPart || !normalizedTitle) return false;
  if (` ${normalizedPart} `.includes(` ${normalizedTitle} `)) return true;
  if (` ${normalizedTitle} `.includes(` ${normalizedPart} `)) {
    const partTokens = new Set(normalizedPart.split(" "));
    const extraTokens = normalizedTitle.split(" ").filter((token) => !partTokens.has(token)).length;
    return extraTokens <= 2;
  }
  return false;
}

/**
 * Mbids de los release-groups PROPIOS del artista: locales si hay créditos
 * ingeridos (costo cero), si no un browse de discografía. Ordenados por
 * categoría (estudio primero: ahí vive la grabación canónica) porque la
 * cláusula Lucene tiene tope y no se puede truncar en orden de uuid.
 */
async function artistReleaseGroupMbids(artist: ArtistCandidate, signal?: AbortSignal): Promise<string[]> {
  const byMbid = new Map<string, ReleaseGroupCategoryValue>();
  if (artist.localId) {
    const rows = await db
      .select({ mbid: releaseGroup.mbid, category: releaseGroup.category })
      .from(credit)
      .innerJoin(releaseGroup, eq(releaseGroup.id, credit.releaseGroupId))
      .where(eq(credit.artistId, artist.localId));
    for (const row of rows) {
      if (row.mbid) byMbid.set(row.mbid, row.category as ReleaseGroupCategoryValue);
    }
  }
  if (byMbid.size === 0 && artist.mbid) {
    try {
      const browse = await musicbrainz.browseReleaseGroupsByArtist(artist.mbid, 0, signal);
      for (const rg of browse["release-groups"]) {
        byMbid.set(rg.id, mapReleaseGroupCategory(rg["primary-type"], rg["secondary-types"]));
      }
    } catch {
      return [];
    }
  }
  return [...byMbid.entries()]
    .sort((a, b) => SONG_RG_CATEGORY_ORDER[a[1]] - SONG_RG_CATEGORY_ORDER[b[1]] || a[0].localeCompare(b[0]))
    .map(([mbid]) => mbid);
}

/**
 * Con artista: grabaciones cuyo TÍTULO coincide, indexadas dentro de los
 * release-groups propios del artista (`rgid:`). `artist:"…"` busca por nombre
 * de crédito y está contaminado por bandas de cover, y la grabación de
 * estudio de "Stairway to Heaven" no tiene artist-credit en MusicBrainz, así
 * que solo el rgid de [Led Zeppelin IV] la encuentra. Sin rgids se degrada a
 * la consulta por nombre; sin artista, texto libre.
 */
async function recordingQueryFor(
  interpretation: Interpretation,
  fallbackText: string,
  signal?: AbortSignal,
): Promise<string> {
  if (!interpretation.artistName) return recordingFreeQuery(fallbackText);
  const rgMbids = interpretation.artist ? await artistReleaseGroupMbids(interpretation.artist, signal) : [];
  if (rgMbids.length > 0) {
    const clause = rgMbids.slice(0, RGID_CLAUSE_LIMIT).map((mbid) => `rgid:${mbid}`).join(" OR ");
    return `"${escapeLucenePhrase(interpretation.songPart)}" AND (${clause})`;
  }
  return recordingFieldQuery(interpretation.artistName, interpretation.songPart);
}

// ---------- Agrupación y apariciones

function primaryArtistName(item: MBRecordingSearchItem): string | null {
  return item["artist-credit"]?.[0]?.name ?? null;
}

/** Datos para registrar la grabación con lo que trae la propia búsqueda, sin otra request. */
function recordingSeed(item: MBRecordingSearchItem) {
  return {
    mbid: item.id,
    title: item.title,
    durationSec: typeof item.length === "number" ? Math.round(item.length / 1000) : null,
    credits: item["artist-credit"] ?? [],
  };
}

// Vive en normalize.ts para que las sugerencias agrupen con el mismo criterio sin importar este
// módulo (openspec: improve-song-suggestions).
export { baseSongTitle };

function groupKey(title: string, artistName: string | null): string {
  return `${normalizeSearchText(baseSongTitle(title))}|${normalizeSearchText(artistName ?? "")}`;
}

interface LocalContribution {
  row: { id: string; mbid: string | null; title: string };
  artistName: string | null;
  appearances: SongContextAlbum[];
}

/**
 * Grabaciones locales con apariciones ingeridas (tracklists de álbumes ya
 * visitados) cuyo título pasa el filtro de relevancia. Con artista, el
 * crédito primario debe coincidir con él.
 */
async function localContributions(interpretation: Interpretation): Promise<LocalContribution[]> {
  const candidates = await matchLocalRecordings(interpretation.songPart, LOCAL_RECORDING_LIMIT);
  const hint = interpretation.artistName ? normalizeSearchText(interpretation.artistName) : null;
  const contributions: LocalContribution[] = [];
  for (const candidate of candidates) {
    if (!isRelevantRecordingTitle(interpretation.songPart, candidate.title)) continue;
    const appearances = await localAppearanceAlbums(candidate.id);
    if (appearances.length === 0) continue;
    const artistName = await localRecordingArtistName(candidate.id);
    if (hint) {
      const normalizedArtist = artistName ? normalizeSearchText(artistName) : "";
      if (!normalizedArtist.includes(hint) && !hint.includes(normalizedArtist)) continue;
    }
    contributions.push({ row: candidate, artistName, appearances });
  }
  return contributions;
}

function mergeAppearances(lists: SongContextAlbum[][]): SongContextAlbum[] {
  const merged = new Map<string, SongContextAlbum>();
  for (const list of lists) {
    for (const album of list) {
      const known = merged.get(album.releaseGroupId);
      if (!known) {
        merged.set(album.releaseGroupId, { ...album });
      } else if (album.year !== null && (known.year === null || album.year < known.year)) {
        known.year = album.year;
      }
    }
  }
  return [...merged.values()];
}

function toSongAlbums(albums: SongContextAlbum[]): SongAlbum[] {
  return sortSongContextAlbums(albums)
    .slice(0, SONG_ALBUM_LIMIT)
    .map((album) => ({
      id: album.releaseGroupId,
      mbid: album.mbid,
      title: album.title,
      category: album.category,
      year: album.year,
    }));
}

interface Group {
  key: string;
  title: string;
  artistName: string | null;
  remote: MBRecordingSearchItem[];
  local: LocalContribution[];
  rank: RankKey;
}

/**
 * Resuelve el primer grupo: browse de apariciones de sus primeras 4
 * grabaciones de MusicBrainz, unión con las apariciones locales del grupo, e
 * ingesta de la grabación identidad (la de más apariciones) — la única de la
 * búsqueda.
 */
async function expandGroup(group: Group, signal?: AbortSignal): Promise<{
  result: SongGroupResult;
  remoteFailed: boolean;
}> {
  const lists: SongContextAlbum[][] = group.local.map((contribution) => contribution.appearances);
  // Identidad = la contribución con más apariciones (la grabación canónica).
  type Identity = { row: LocalContribution["row"]; artistName: string | null; count: number };
  let identity: Identity | null = null;
  for (const contribution of group.local) {
    if (!identity || contribution.appearances.length > identity.count) {
      identity = { row: contribution.row, artistName: contribution.artistName, count: contribution.appearances.length };
    }
  }
  let winner: { item: MBRecordingSearchItem; count: number } | null = null;
  let remoteFailed = false;

  try {
    for (const item of group.remote.slice(0, CANDIDATE_BROWSE_LIMIT)) {
      const browse = await musicbrainz.browseReleasesByRecording(item.id, signal);
      signal?.throwIfAborted();
      const appearances = await albumsFromMbReleases(browse.releases);
      if (appearances.length === 0) continue;
      lists.push(appearances);
      const count = browse["release-count"] ?? appearances.length;
      if (!winner || count > winner.count) winner = { item, count };
    }
  } catch {
    remoteFailed = true;
  }
  signal?.throwIfAborted();

  if (winner && (!identity || winner.count > identity.count)) {
    const [existing] = await db.select().from(recording).where(eq(recording.mbid, winner.item.id)).limit(1);
    const row = existing ?? (await findOrIngestRecording(recordingSeed(winner.item)));
    identity = {
      row,
      artistName: (await localRecordingArtistName(row.id)) ?? primaryArtistName(winner.item),
      count: winner.count,
    };
  }

  const artistName = identity?.artistName ?? group.artistName;
  return {
    result: {
      kind: "song",
      key: group.key,
      title: group.title,
      artistName,
      recordingId: identity?.row.id ?? null,
      mbid: identity?.row.mbid ?? null,
      albums: toSongAlbums(mergeAppearances(lists)),
      query: artistName ? `${artistName} - ${group.title}` : group.title,
    },
    remoteFailed,
  };
}

/** La contribución local con más apariciones (la grabación canónica conocida). */
function bestLocal(group: Group): LocalContribution | null {
  return group.local.reduce<LocalContribution | null>(
    (current, contribution) =>
      !current || contribution.appearances.length > current.appearances.length ? contribution : current,
    null,
  );
}

/** Primer grupo solo con lo local: apariciones ya ingeridas, sin browse ni ingesta. */
function localExpandedResult(group: Group): SongGroupResult {
  const best = bestLocal(group);
  return {
    ...collapsedResult(group),
    recordingId: best?.row.id ?? null,
    mbid: best?.row.mbid ?? null,
    albums: toSongAlbums(mergeAppearances(group.local.map((contribution) => contribution.appearances))),
  };
}

function collapsedResult(group: Group): SongGroupResult {
  return {
    kind: "song",
    key: group.key,
    title: group.title,
    artistName: group.artistName,
    recordingId: null,
    mbid: null,
    albums: [],
    query: group.artistName ? `${group.artistName} - ${group.title}` : group.title,
  };
}

/**
 * Grupo del modo de elección (openspec: speed-up-quick-actions-search): sin apariciones, con la
 * grabación identidad que se pueda registrar sin otra request. Primero la local con más
 * apariciones; si no hay, la primera remota sin `disambiguation` (las tomas en vivo y los remixes
 * casi siempre la tienen) y, si todas la tienen, la primera.
 */
async function pickedResult(group: Group, signal?: AbortSignal): Promise<SongGroupResult> {
  const best = bestLocal(group);
  if (best) {
    return {
      ...collapsedResult(group),
      artistName: best.artistName ?? group.artistName,
      recordingId: best.row.id,
      mbid: best.row.mbid,
    };
  }
  const item = group.remote.find((candidate) => !candidate.disambiguation) ?? group.remote[0];
  if (!item) return collapsedResult(group);
  signal?.throwIfAborted();
  const row = await findOrIngestRecording(recordingSeed(item));
  return { ...collapsedResult(group), recordingId: row.id, mbid: row.mbid };
}

export interface SongSearchOptions {
  offset?: number;
  /**
   * Solo apariciones locales (tracklists ya ingeridas), sin MusicBrainz ni
   * escrituras: lo que la página pinta al instante mientras llega el resto.
   */
  localOnly?: boolean;
  /**
   * `pick`: elegir un objetivo. Hasta `PICK_GROUP_LIMIT` grupos, todos con grabación identidad,
   * sin browse de apariciones (`albums: []`) y sin paginar.
   */
  purpose?: SearchPurpose;
  /** Abandono de quien busca: descarta las requests en cola y evita escribir. */
  signal?: AbortSignal;
}

export async function searchSongs(
  query: string,
  { offset = 0, localOnly = false, purpose, signal }: SongSearchOptions = {},
): Promise<SongSearchResponse> {
  const pick = purpose === "pick";
  const q = query.trim();
  const text = withoutSeparator(q);

  const { candidates, remoteFailed: artistLegFailed } = await artistCandidates(text, localOnly, signal);
  const interpretations = rankInterpretations(q, candidates);
  // La mejor interpretación con artista y, si no da nada, la consulta
  // completa como título (la cobertura de términos ordena igual los grupos).
  // Con separador explícito, los dos órdenes escritos. Nunca más de dos
  // búsquedas de recordings. Probar una segunda lectura con artista en vez
  // del texto libre dejaba vacío "kiss of death": "KISS" y "Death" ocupan
  // sus extremos y ninguna de las dos lecturas tiene esa canción.
  const freeText: Interpretation = { songPart: normalizeSearchText(text), artist: null, artistName: null };
  const attempts = (
    splitExplicit(q) ? interpretations : [...interpretations.slice(0, 1), freeText]
  ).slice(0, MAX_ATTEMPTS);

  let chosen: Interpretation | null = null;
  let recordings: MBRecordingSearchItem[] = [];
  let total: number | null = null;
  /** Tamaño crudo de la página (antes del filtro de relevancia), para paginar. */
  let pageSize = 0;
  let remoteFailed = artistLegFailed;
  for (const attempt of localOnly ? [] : attempts) {
    try {
      const response = await musicbrainz.searchRecording(await recordingQueryFor(attempt, text, signal), {
        offset,
        signal,
      });
      // Con artista, un título igual a la consulta COMPLETA no confirma la
      // lectura "canción X de artista Y": la persona escribió un título
      // ("stairway de prueba" no es «de prueba» de la banda Stairway).
      const fullQuery = normalizeSearchText(text);
      const relevant = response.recordings.filter(
        (item) =>
          isRelevantRecordingTitle(attempt.songPart, item.title) &&
          !(attempt.artistName && normalizeSearchText(baseSongTitle(item.title)) === fullQuery),
      );
      if (relevant.length > 0) {
        chosen = attempt;
        recordings = relevant;
        total = response.count ?? null;
        pageSize = response.recordings.length;
        break;
      }
    } catch {
      remoteFailed = true;
      break;
    }
  }
  // Abandonada: ni escrituras ni respuesta.
  signal?.throwIfAborted();
  // Solo local: la mejor interpretación con artista local, si la hay.
  const used = chosen ?? attempts[0] ?? freeText;

  // Lo local (apariciones ya ingeridas) solo acompaña a la primera página.
  const local = offset === 0 ? await localContributions(used).catch(() => []) : [];
  if (remoteFailed && recordings.length === 0 && local.length === 0) {
    throw new ApiError("INTERNAL_ERROR", 502, "MusicBrainz no respondió y no hay coincidencias locales");
  }

  const groups = new Map<string, Group>();
  const groupFor = (title: string, artistName: string | null, index: number): Group => {
    const key = groupKey(title, artistName);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        title: baseSongTitle(title),
        artistName,
        remote: [],
        local: [],
        rank: { level: 0, activity: 0, group: 1, index },
      };
      groups.set(key, group);
    }
    return group;
  };
  // Grabaciones sin artist-credit (defecto de datos de MusicBrainz: el
  // *Stairway to Heaven* de estudio no lo tiene) no forman un grupo propio:
  // van con el artista interpretado o con el grupo del mismo título. Primero
  // las acreditadas, para que ese grupo ya exista.
  const uncredited: { item: MBRecordingSearchItem; index: number }[] = [];
  recordings.forEach((item, index) => {
    const artistName = primaryArtistName(item) ?? chosen?.artistName ?? null;
    if (artistName) groupFor(item.title, artistName, index).remote.push(item);
    else uncredited.push({ item, index });
  });
  for (const { item, index } of uncredited) {
    const titleKey = normalizeSearchText(baseSongTitle(item.title));
    const sameTitle = [...groups.values()].find((group) => normalizeSearchText(group.title) === titleKey);
    (sameTitle ?? groupFor(item.title, null, index)).remote.push(item);
  }
  local.forEach((contribution, index) => {
    const group = groupFor(contribution.row.title, contribution.artistName, recordings.length + index);
    group.local.push(contribution);
    group.rank.group = 0;
  });

  const allGroups = [...groups.values()];
  const activity = await activityScores(
    "recording",
    allGroups.flatMap((group) => group.local.map((contribution) => contribution.row.id)),
  );
  for (const group of allGroups) {
    group.rank.level = coverageLevel(text, group.title, group.artistName ? [group.artistName] : []);
    group.rank.activity = group.local.reduce((sum, contribution) => sum + (activity.get(contribution.row.id) ?? 0), 0);
  }
  const ranked = sortByRank(allGroups);

  const results: SongGroupResult[] = [];
  if (pick) {
    for (const group of ranked.slice(0, PICK_GROUP_LIMIT)) {
      const result = await pickedResult(group, signal);
      if (result.recordingId) results.push(result);
    }
  }
  for (const [index, group] of (pick ? [] : ranked).entries()) {
    if (index === 0 && offset === 0 && localOnly) {
      results.push(localExpandedResult(group));
    } else if (index === 0 && offset === 0) {
      const expanded = await expandGroup(group, signal);
      remoteFailed ||= expanded.remoteFailed;
      results.push(expanded.result);
    } else {
      results.push(collapsedResult(group));
    }
  }

  const interpretation = chosen?.artistName ? { song: chosen.songPart, artistName: chosen.artistName } : null;
  // Alternativa solo si hubo interpretación con artista: la siguiente lectura
  // posible NO probada, reescrita con separador explícito, y solo si es
  // plausible (el resto de extremos — "Led", "Heaven" — es ruido).
  const alternatives: SongAlternative[] = (interpretation ? interpretations : [])
    .filter((item) => !attempts.includes(item) && item.artistName && isPlausibleAlternative(item))
    .slice(0, 1)
    .map((item) => ({
      song: item.songPart,
      artistName: item.artistName,
      query: `${item.artistName} - ${item.songPart}`,
    }));
  const refine =
    offset === 0 && !interpretation && total !== null && total > GENERIC_QUERY_THRESHOLD
      ? { total, artists: topArtistNames(ranked.map((group) => group.artistName), REFINE_ARTIST_LIMIT) }
      : null;
  const fetched = offset + pageSize;

  return {
    type: "song",
    results,
    remoteFailed,
    total,
    nextOffset: !pick && total !== null && pageSize > 0 && fetched < total ? fetched : null,
    interpretation,
    alternatives,
    refine,
  };
}
