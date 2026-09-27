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
  credit,
  recording,
  release,
  releaseGroup,
  type ArtistRow,
  type RecordingRow,
  type ReleaseGroupRow,
} from "@/db/schema";
import type { ReleaseGroupCategoryValue } from "../ingest-release-group";
import type { ArtistTypeFilter } from "./mb-query";
import { escapeLike, matchTier } from "./normalize";

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

export async function matchLocalRecordings(text: string, limit: number): Promise<RecordingRow[]> {
  const rows = await db
    .select()
    .from(recording)
    .where(fuzzyMatch(recording.title, text))
    .orderBy(bySimilarity(recording.title, text))
    .limit(CANDIDATE_POOL);
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
