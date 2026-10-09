// Coincidencias LOCALES de la búsqueda por tipo (openspec:
// redesign-scoped-search). Solo lecturas: ningún camino de este módulo sale a
// MusicBrainz ni escribe, así que lo comparten la búsqueda completa y las
// sugerencias del buscador.
//
// El bug de "icon" venía de `ILIKE '%q%' LIMIT n` sin orden: con más de n
// nombres que contenían la subcadena, el tope podía dejar fuera la
// coincidencia exacta. Acá se pide un grupo amplio ordenado por similitud
// (índices trigram de la migración 0050) y el orden final lo decide
// `matchTier` en TypeScript, con la misma normalización que el resto.

import { and, asc, eq, inArray, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  artist,
  artistFollow,
  credit,
  recording,
  release,
  releaseGroup,
  track,
  type ArtistRow,
  type RecordingRow,
  type ReleaseGroupRow,
} from "@/db/schema";
import type { ReleaseGroupCategoryValue } from "../ingest-release-group";
import type { ArtistTypeFilter } from "./mb-query";
import { escapeLike, matchTier, normalizeSearchText } from "./normalize";

/** Filas candidatas que se piden a la base antes de ordenar y recortar en TS. */
const CANDIDATE_POOL = 40;

/** Coincidencia tolerante de `column` con el texto: trigramas o subcadena, sin acentos. */
function fuzzyMatch(column: AnyColumn, text: string): SQL {
  const pattern = `%${escapeLike(text)}%`;
  return sql`(search_normalize(${column}) % search_normalize(${text}) OR search_normalize(${column}) LIKE search_normalize(${pattern}))`;
}

function bySimilarity(column: AnyColumn, text: string): SQL {
  return sql`similarity(search_normalize(${column}), search_normalize(${text})) DESC`;
}

/**
 * Ordena por nivel de coincidencia (exacta → palabra completa → prefijo →
 * resto) preservando, dentro de cada nivel, el orden de similitud de la base.
 */
export function rankByMatchTier<T>(rows: T[], name: (row: T) => string, text: string): T[] {
  return rows
    .map((row, index) => ({ row, index, tier: matchTier(name(row), text) }))
    .sort((a, b) => a.tier - b.tier || a.index - b.index)
    .map(({ row }) => row);
}

export interface LocalArtistOptions {
  limit: number;
  artistType?: ArtistTypeFilter;
}

export async function matchLocalArtists(
  text: string,
  { limit, artistType }: LocalArtistOptions,
): Promise<ArtistRow[]> {
  const rows = await db
    .select()
    .from(artist)
    .where(
      artistType ? and(fuzzyMatch(artist.name, text), eq(artist.type, artistType)) : fuzzyMatch(artist.name, text),
    )
    .orderBy(bySimilarity(artist.name, text))
    .limit(CANDIDATE_POOL);
  return rankByMatchTier(rows, (row) => row.name, text).slice(0, limit);
}

export interface LocalReleaseGroupOptions {
  limit: number;
  category?: ReleaseGroupCategoryValue;
  decade?: number;
}

function releaseGroupFilters({ category, decade }: Omit<LocalReleaseGroupOptions, "limit">): SQL[] {
  const filters: SQL[] = [];
  if (category) filters.push(sql`${releaseGroup.category} = ${category}`);
  if (decade !== undefined) {
    filters.push(sql`${releaseGroup.firstReleaseYear} BETWEEN ${decade} AND ${decade + 9}`);
  }
  return filters;
}

export async function matchLocalReleaseGroups(
  text: string,
  { limit, ...filters }: LocalReleaseGroupOptions,
): Promise<ReleaseGroupRow[]> {
  const rows = await db
    .select()
    .from(releaseGroup)
    .where(and(fuzzyMatch(releaseGroup.title, text), ...releaseGroupFilters(filters)))
    .orderBy(bySimilarity(releaseGroup.title, text))
    .limit(CANDIDATE_POOL);
  return rankByMatchTier(rows, (row) => row.title, text).slice(0, limit);
}

/**
 * `pool`: filas que se piden a la base antes de ordenar. Las sugerencias de canción piden más porque
 * agrupan versiones (openspec: improve-song-suggestions). Con 2 caracteres las sugerencias no pasan
 * por aquí: usan `shortPrefixRecordings`.
 */
export async function matchLocalRecordings(
  text: string,
  limit: number,
  pool: number = CANDIDATE_POOL,
): Promise<RecordingRow[]> {
  const rows = await db
    .select()
    .from(recording)
    .where(fuzzyMatch(recording.title, text))
    .orderBy(bySimilarity(recording.title, text))
    .limit(pool);
  return rankByMatchTier(rows, (row) => row.title, text).slice(0, limit);
}

/**
 * Artistas cuyo nombre normalizado es EXACTAMENTE alguna de las claves dadas
 * (`search_key`, migración 0051). Sirve la detección de "artista + título":
 * las claves son los extremos posibles de la consulta.
 */
export async function findArtistsByKeys(keys: string[]): Promise<ArtistRow[]> {
  if (keys.length === 0) return [];
  return db
    .select()
    .from(artist)
    .where(inArray(sql`search_key(${artist.name})`, keys));
}

export interface ArtistTitleMatch {
  row: ReleaseGroupRow;
  artistId: string;
}

/**
 * Álbumes con crédito primario de alguno de `artistIds` cuyo título coincide
 * con `title`: por prefijo (sugerencias mientras se escribe) o de forma
 * tolerante (búsqueda completa).
 */
export async function releaseGroupsByArtistsAndTitle(
  artistIds: string[],
  title: string,
  { limit, mode, ...filters }: LocalReleaseGroupOptions & { mode: "prefix" | "fuzzy" },
): Promise<ArtistTitleMatch[]> {
  if (artistIds.length === 0 || !title.trim()) return [];
  const titleFilter =
    mode === "prefix"
      ? sql`search_key(${releaseGroup.title}) LIKE ${`${escapeLike(title)}%`}`
      : fuzzyMatch(releaseGroup.title, title);
  const rows = await db
    .select({ row: releaseGroup, artistId: credit.artistId })
    .from(credit)
    .innerJoin(releaseGroup, eq(releaseGroup.id, credit.releaseGroupId))
    .where(
      and(
        inArray(credit.artistId, artistIds),
        eq(credit.role, "primary"),
        titleFilter,
        ...releaseGroupFilters(filters),
      ),
    )
    .orderBy(bySimilarity(releaseGroup.title, title))
    .limit(CANDIDATE_POOL);
  return rankByMatchTier(rows, ({ row }) => row.title, title).slice(0, limit);
}

/**
 * Álbumes con crédito primario de alguno de `artistIds`, sin filtrar por título: la consulta es el
 * nombre del artista ("pink floyd"). Primero los de estudio y los más antiguos, que es donde está
 * lo que se busca; el orden final lo decide el ranking.
 */
export async function releaseGroupsByArtists(
  artistIds: string[],
  { limit, ...filters }: LocalReleaseGroupOptions,
): Promise<ReleaseGroupRow[]> {
  if (artistIds.length === 0) return [];
  // Subconsulta en vez de DISTINCT: Postgres exige que el ORDER BY de un DISTINCT esté en el SELECT.
  const credited = db
    .select({ id: credit.releaseGroupId })
    .from(credit)
    .where(and(inArray(credit.artistId, artistIds), eq(credit.role, "primary")));
  return db
    .select()
    .from(releaseGroup)
    .where(
      and(
        inArray(releaseGroup.id, credited),
        sql`${releaseGroup.discographyUnlistedAt} IS NULL`,
        ...releaseGroupFilters(filters),
      ),
    )
    .orderBy(
      sql`(${releaseGroup.category} = 'studio') DESC`,
      sql`${releaseGroup.firstReleaseYear} ASC NULLS LAST`,
      asc(releaseGroup.id),
    )
    .limit(limit);
}

/** Artistas primarios de cada álbum, en orden de crédito. */
export async function primaryArtistsByReleaseGroup(
  releaseGroupIds: string[],
): Promise<Map<string, { id: string; name: string }[]>> {
  const byGroup = new Map<string, { id: string; name: string }[]>();
  if (releaseGroupIds.length === 0) return byGroup;
  const rows = await db
    .select({ releaseGroupId: credit.releaseGroupId, id: artist.id, name: artist.name })
    .from(credit)
    .innerJoin(artist, eq(artist.id, credit.artistId))
    .where(and(inArray(credit.releaseGroupId, releaseGroupIds), eq(credit.role, "primary")))
    .orderBy(asc(credit.position));
  for (const row of rows) {
    if (!row.releaseGroupId) continue;
    const list = byGroup.get(row.releaseGroupId) ?? [];
    list.push({ id: row.id, name: row.name });
    byGroup.set(row.releaseGroupId, list);
  }
  return byGroup;
}

/** Álbumes con al menos un release ingerido (tracklist de una visita previa). */
export async function releaseGroupsWithContent(releaseGroupIds: string[]): Promise<Set<string>> {
  if (releaseGroupIds.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ releaseGroupId: release.releaseGroupId })
    .from(release)
    .where(inArray(release.releaseGroupId, releaseGroupIds));
  return new Set(rows.map((row) => row.releaseGroupId));
}

/**
 * Grabaciones con crédito principal de alguno de `artistIds` cuyo título EMPIEZA por `title` (ya
 * normalizado): el puente artista + canción de las sugerencias (openspec: improve-song-suggestions).
 * Prefijo, porque la persona todavía está escribiendo.
 */
export async function recordingsByArtistsAndTitlePrefix(
  artistIds: string[],
  title: string,
  limit: number,
): Promise<RecordingRow[]> {
  if (artistIds.length === 0 || !title.trim()) return [];
  const rows = await db
    .select({ row: recording })
    .from(credit)
    .innerJoin(recording, eq(recording.id, credit.recordingId))
    .where(
      and(
        inArray(credit.artistId, artistIds),
        eq(credit.role, "primary"),
        sql`search_key(${recording.title}) LIKE ${`${escapeLike(title)}%`}`,
      ),
    )
    .orderBy(bySimilarity(recording.title, title))
    .limit(limit);
  return rows.map(({ row }) => row);
}

export interface RecordingSignals {
  /** Artista principal de cada grabación (el de menor posición de crédito). */
  artistByRecording: Map<string, { id: string; name: string; explored: boolean }>;
  /** Álbumes (`release_group` distintos) en que aparece cada grabación; ausente = ninguno. */
  albumsByRecording: Map<string, number>;
  /** Seguidores de cada artista principal; ausente = ninguno. */
  followersByArtist: Map<string, number>;
}

/**
 * Señales para ordenar sugerencias de canción, en tres consultas en lote y en paralelo sobre los
 * candidatos (nunca una por fila). Solo lecturas; ninguna cifra se expone en la respuesta.
 */
export async function recordingSignals(recordingIds: string[]): Promise<RecordingSignals> {
  const signals: RecordingSignals = {
    artistByRecording: new Map(),
    albumsByRecording: new Map(),
    followersByArtist: new Map(),
  };
  const ids = [...new Set(recordingIds)];
  if (ids.length === 0) return signals;

  const primaryArtistIds = db
    .select({ artistId: credit.artistId })
    .from(credit)
    .where(and(inArray(credit.recordingId, ids), eq(credit.role, "primary")));
  const [artists, albums, followers] = await Promise.all([
    db
      .select({
        recordingId: credit.recordingId,
        id: artist.id,
        name: artist.name,
        syncedAt: artist.discographySyncedAt,
      })
      .from(credit)
      .innerJoin(artist, eq(artist.id, credit.artistId))
      .where(and(inArray(credit.recordingId, ids), eq(credit.role, "primary")))
      .orderBy(asc(credit.position)),
    db
      .select({
        recordingId: track.recordingId,
        albums: sql<number>`count(DISTINCT ${release.releaseGroupId})::int`,
      })
      .from(track)
      .innerJoin(release, eq(release.id, track.releaseId))
      .where(inArray(track.recordingId, ids))
      .groupBy(track.recordingId),
    db
      .select({ artistId: artistFollow.artistId, followers: sql<number>`count(*)::int` })
      .from(artistFollow)
      .where(inArray(artistFollow.artistId, primaryArtistIds))
      .groupBy(artistFollow.artistId),
  ]);

  for (const row of artists) {
    if (!row.recordingId || signals.artistByRecording.has(row.recordingId)) continue;
    signals.artistByRecording.set(row.recordingId, { id: row.id, name: row.name, explored: row.syncedAt !== null });
  }
  for (const row of albums) signals.albumsByRecording.set(row.recordingId, Number(row.albums));
  for (const row of followers) signals.followersByArtist.set(row.artistId, Number(row.followers));
  return signals;
}

// ---------- Sugerencias de 2 caracteres (openspec: speed-up-short-suggestions, ADR 0031)
//
// Con 2 letras se busca una palabra que EMPIEZA por ellas sobre `search_text` (nombre ya
// normalizado y guardado, migración 0067), con el índice GIN de esa columna. Entre miles de
// coincidencias, los candidatos se eligen con señales baratas de la propia fila: el nombre empieza
// por las letras, la entidad ya es conocida en la plataforma y el nombre más corto.

/** Patrón de inicio de palabra sobre `search_text`, con la consulta normalizada como en `search_key`. */
function wordStart(text: string): { pattern: string; prefix: string } {
  const normalized = normalizeSearchText(text);
  return {
    pattern: `(^| )${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    prefix: `${escapeLike(normalized)}%`,
  };
}

/** Artistas: nombre empieza por → discografía explorada → nombre más corto. */
export async function shortPrefixArtists(text: string, limit: number): Promise<ArtistRow[]> {
  const { pattern, prefix } = wordStart(text);
  return db
    .select()
    .from(artist)
    .where(sql`${artist.searchText} ~ ${pattern}`)
    .orderBy(
      sql`(${artist.searchText} LIKE ${prefix}) DESC`,
      sql`(${artist.discographySyncedAt} IS NOT NULL) DESC`,
      sql`length(${artist.name})`,
    )
    .limit(limit);
}

/** Álbumes: título empieza por → álbum ya abierto (ediciones sincronizadas) → título más corto. */
export async function shortPrefixReleaseGroups(text: string, limit: number): Promise<ReleaseGroupRow[]> {
  const { pattern, prefix } = wordStart(text);
  return db
    .select()
    .from(releaseGroup)
    .where(sql`${releaseGroup.searchText} ~ ${pattern}`)
    .orderBy(
      sql`(${releaseGroup.searchText} LIKE ${prefix}) DESC`,
      sql`(${releaseGroup.editionsSyncedAt} IS NOT NULL) DESC`,
      sql`length(${releaseGroup.title})`,
    )
    .limit(limit);
}

/**
 * Canciones: título empieza por → aparece en más pistas (ediciones que la incluyen) → título más
 * corto. Las pistas son la mejor señal de popularidad local y salen del índice `idx_track_recording`
 * (4–12 ms en scratch); "artista explorado" costaba 30–35 ms y no distinguía: hay cientos de
 * artistas explorados poco conocidos.
 */
export async function shortPrefixRecordings(text: string, limit: number): Promise<RecordingRow[]> {
  const { pattern, prefix } = wordStart(text);
  return db
    .select()
    .from(recording)
    .where(sql`${recording.searchText} ~ ${pattern}`)
    .orderBy(
      sql`(${recording.searchText} LIKE ${prefix}) DESC`,
      sql`(SELECT count(*) FROM ${track} WHERE ${track.recordingId} = ${recording.id}) DESC`,
      sql`length(${recording.title})`,
    )
    .limit(limit);
}
