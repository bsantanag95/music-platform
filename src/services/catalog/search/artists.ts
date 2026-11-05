// Búsqueda del tipo Artistas (openspec: redesign-scoped-search).
//
// Presupuesto: UNA solicitud a MusicBrainz. No resuelve álbumes ni canciones:
// buscar "Sabrina Carpenter" ya no dispara la pata de grabaciones ni la de
// release-groups. Los candidatos de MusicBrainz aún no vistos se persisten
// como stub (una operación) para que todo resultado enlace por id local.

import { ApiError } from "@/lib/api/errors";
import type { ArtistRow } from "@/db/schema";
import { musicbrainz } from "../../musicbrainz/client";
import type { MBArtistSearchItem } from "../../musicbrainz/types";
import { upsertArtistStubsFromSearch } from "../ingest-artist";
import { activityScores, primaryDiscCounts } from "./activity";
import {
  activeSpans,
  catalogArtistPage,
  hasCatalogFields,
  memberOf,
  resolveCatalogFields,
  withoutUnresolved,
  type ArtistCatalogFilters,
  type ResolvedCatalogFields,
} from "./catalog-fields";
import { matchLocalArtists } from "./local-match";
import { artistQuery, type ArtistQueryFilters } from "./mb-query";
import { isExactMatch, matchTier } from "./normalize";
import { localOnlyIndex, sortByRank, type RankKey } from "./rank";
import type { ArtistSearchResponse, ArtistSearchResult, CatalogArtistType } from "./types";

const LOCAL_LIMIT = 10;

export interface ArtistSearchOptions {
  /**
   * Persona/Grupo y criterios de la búsqueda avanzada: nombre exacto, países, ciudad o región,
   * inicio de actividad y estado (openspec: add-advanced-search-phase1, redesign-advanced-search).
   */
  filters?: ArtistQueryFilters;
  /** Página siguiente de MusicBrainz; lo local solo acompaña a la primera. */
  offset?: number;
  /** Abandono de quien busca: descarta la request en cola y evita escribir stubs. */
  signal?: AbortSignal;
  /**
   * Solo coincidencias locales, sin MusicBrainz ni stubs: lo que la página muestra mientras llega
   * MusicBrainz (openspec: speed-up-search).
   */
  localOnly?: boolean;
  /**
   * Campos del catálogo (openspec: add-catalog-search-fields): con alguno válido, la búsqueda entera sale de la base
   * propia, paginada, sin MusicBrainz (`catalogOnly`).
   */
  catalog?: ArtistCatalogFilters;
}

function isArtistType(value: string): value is CatalogArtistType {
  return value === "person" || value === "group" || value === "various" || value === "unknown";
}

interface Entry {
  row: ArtistRow;
  disambiguation: string | null;
  country: string | null;
  /** El resultado de MusicBrainz, si vino en la página: años y lugar de un stub aún sin ficha. */
  remote?: MBArtistSearchItem;
  rank: RankKey;
}

/** Año de una fecha parcial de MusicBrainz ("1973", "1973-01", "1973-01-30"). */
function yearOf(date: string | null | undefined): number | null {
  const year = date ? Number(date.slice(0, 4)) : NaN;
  return Number.isInteger(year) ? year : null;
}

interface Extras {
  discCounts: Map<string, number>;
  members: Map<string, { id: string; name: string; more: number }>;
  spans?: Map<string, { from: number; to: number | null }>;
}

function toResult(entry: Entry, query: string, { discCounts, members, spans }: Extras): ArtistSearchResult {
  const span = spans?.get(entry.row.id);
  // La ficha local manda; un stub sin ficha toma lo que trae la búsqueda (openspec: refine-advanced-search-phase3).
  const life = entry.remote?.["life-span"];
  const ended = entry.row.lifeEnded ?? life?.ended ?? null;
  return {
    kind: "artist",
    id: entry.row.id,
    mbid: entry.row.mbid,
    name: entry.row.name,
    disambiguation: entry.disambiguation,
    artistType: isArtistType(entry.row.type) ? entry.row.type : "unknown",
    country: entry.country,
    cached: entry.row.discographySyncedAt !== null,
    exact: isExactMatch(entry.row.name, query),
    photoUrl: entry.row.photoBlockedAt ? null : (entry.row.photoUrl ?? null),
    beginYear: yearOf(entry.row.lifeBegin ?? life?.begin),
    endYear: ended ? yearOf(entry.row.lifeEnd ?? life?.end) : null,
    discCount: entry.row.discographySyncedAt ? (discCounts.get(entry.row.id) ?? 0) : null,
    beginArea: entry.row.beginAreaName ?? entry.remote?.["begin-area"]?.name ?? null,
    ...(spans ? { activeFrom: span?.from ?? null, activeTo: span ? span.to : null } : {}),
    memberOf: members.get(entry.row.id) ?? null,
  };
}

/**
 * Coincidencias locales + una página de MusicBrainz, deduplicadas por mbid y
 * ordenadas: exacta → palabra completa → prefijo → resto; dentro de cada
 * nivel, actividad → cacheado → resto de locales → solo MusicBrainz (score).
 *
 * Lanza `ApiError(INTERNAL_ERROR, 502)` si MusicBrainz falla y no hay nada
 * local; si hay, degrada con `remoteFailed: true` (visible en la página).
 */
export async function searchArtists(
  query: string,
  { filters = {}, offset = 0, signal, localOnly = false, catalog }: ArtistSearchOptions = {},
): Promise<ArtistSearchResponse> {
  const q = query.trim();
  // Otras personas (integrantes, producción, sesión) solo lo distingue la base propia (openspec: split-person-search-types).
  const otherPersons = filters.artistType === "other";
  if (otherPersons || (catalog && hasCatalogFields(catalog))) {
    const resolved = await resolveCatalogFields(catalog ?? {});
    const fields = withoutUnresolved(catalog ?? {}, resolved);
    if (otherPersons || hasCatalogFields(fields)) return catalogArtists(q, filters, fields, resolved, offset);
  }
  // Cada fuente filtra con el mismo criterio: lo local por SQL, lo remoto en la propia consulta.
  // Un artista local sin el dato queda fuera de lo local, pero vuelve con los datos de MusicBrainz
  // si su página remota lo trae (se fusiona por mbid más abajo). Sin nombre, la consulta es solo de
  // criterios (openspec: redesign-advanced-search).
  const localRows = offset === 0 ? await matchLocalArtists(q, { limit: LOCAL_LIMIT, ...filters }) : [];

  let remote: MBArtistSearchItem[] = [];
  let total: number | null = null;
  let remoteFailed = false;
  if (!localOnly) {
    try {
      const page = await musicbrainz.searchArtist(artistQuery(q, filters), { offset, signal });
      remote = page.artists;
      total = page.count ?? null;
    } catch {
      remoteFailed = true;
    }
  }
  // Abandonada: ni stubs ni respuesta.
  signal?.throwIfAborted();
  if (remoteFailed && localRows.length === 0) {
    throw new ApiError("INTERNAL_ERROR", 502, "MusicBrainz no respondió y no hay coincidencias locales");
  }

  const knownMbids = new Set(localRows.map((row) => row.mbid).filter((mbid) => mbid !== null));
  const stubbed = localOnly
    ? []
    : await upsertArtistStubsFromSearch(
        remote
          .filter((item) => !knownMbids.has(item.id))
          .map((item) => ({
            mbid: item.id,
            name: item.name,
            mbType: item.type,
            disambiguation: item.disambiguation ?? null,
          })),
      );
  const stubByMbid = new Map(stubbed.map((row) => [row.mbid, row]));
  const remoteByMbid = new Map(remote.map((item) => [item.id, item]));
  const remoteIndex = new Map(remote.map((item, index) => [item.id, index]));

  const entries: Entry[] = localRows.map((row, index) => {
    const remoteItem = row.mbid ? remoteByMbid.get(row.mbid) : undefined;
    return {
      row,
      disambiguation: row.disambiguation ?? remoteItem?.disambiguation ?? null,
      country: row.country ?? remoteItem?.country ?? null,
      remote: remoteItem,
      rank: {
        level: 0,
        activity: 0,
        group: row.discographySyncedAt ? 0 : 1,
        index: (row.mbid ? remoteIndex.get(row.mbid) : undefined) ?? localOnlyIndex(index),
      },
    };
  });
  remote.forEach((item, index) => {
    if (knownMbids.has(item.id)) return;
    const row = stubByMbid.get(item.id);
    if (!row) return;
    entries.push({
      row,
      disambiguation: item.disambiguation ?? row.disambiguation ?? null,
      country: item.country ?? row.country ?? null,
      remote: item,
      rank: { level: 0, activity: 0, group: 1, index },
    });
  });

  // Un stub ya existente puede tener otro tipo que el filtro pedido. La frase de MusicBrainz trae
  // también nombres más largos ("Kiss" → "Kiss Kiss"): con nombre exacto se reaplica la igualdad.
  const { artistType } = filters;
  const rowType = artistType === undefined ? undefined : artistType === "group" ? "group" : "person";
  const matching = entries.filter(
    (entry) => (!rowType || entry.row.type === rowType) && (!filters.exact || isExactMatch(entry.row.name, q)),
  );
  // Discos principales de los artistas explorados de esta página, en una consulta (openspec: refine-search-results-phase3).
  const discCounts = await primaryDiscCounts(
    matching.filter((entry) => entry.row.discographySyncedAt !== null).map((entry) => entry.row.id),
  );
  // Solista quita solo lo que el catálogo sabe: discografía explorada y ningún disco propio. Una persona sin explorar
  // se conserva, porque puede ser un solista cargado como integrante (openspec: split-person-search-types).
  const filtered =
    artistType === "solo"
      ? matching.filter((entry) => entry.row.discographySyncedAt === null || (discCounts.get(entry.row.id) ?? 0) > 0)
      : matching;
  const activity = await activityScores(
    "artist",
    filtered.map((entry) => entry.row.id),
  );
  for (const entry of filtered) {
    entry.rank.level = matchTier(entry.row.name, q);
    entry.rank.activity = activity.get(entry.row.id) ?? 0;
  }

  const fetched = offset + remote.length;
  // "Integrante de" de las personas de la página, en una consulta (openspec: add-catalog-search-fields).
  const members = await memberOf(filtered.map((entry) => entry.row));
  return {
    type: "artist",
    results: sortByRank(filtered).map((entry) => toResult(entry, q, { discCounts, members })),
    remoteFailed,
    total,
    nextOffset: total !== null && remote.length > 0 && fetched < total ? fetched : null,
    catalogOnly: false,
  };
}

/**
 * Artistas solo del catálogo (openspec: add-catalog-search-fields): una página de 25 en el orden de la base, con la
 * cifra exacta, sin MusicBrainz ni stubs. Con un filtro de actividad, cada fila trae su período.
 */
async function catalogArtists(
  q: string,
  filters: ArtistQueryFilters,
  fields: ArtistCatalogFilters,
  resolved: ResolvedCatalogFields,
  offset: number,
): Promise<ArtistSearchResponse> {
  const page = await catalogArtistPage(q, filters, fields, resolved, offset);
  const active = fields.activeFrom !== undefined || fields.activeTo !== undefined;
  const [discCounts, members, spans] = await Promise.all([
    primaryDiscCounts(page.rows.filter((row) => row.discographySyncedAt !== null).map((row) => row.id)),
    memberOf(page.rows),
    active ? activeSpans(page.rows) : undefined,
  ]);
  const entries: Entry[] = page.rows.map((row, index) => ({
    row,
    disambiguation: row.disambiguation,
    country: row.country,
    rank: { level: 0, activity: 0, group: 0, index },
  }));
  return {
    type: "artist",
    results: entries.map((entry) => toResult(entry, q, { discCounts, members, spans })),
    remoteFailed: false,
    total: page.total,
    nextOffset: page.nextOffset,
    catalogOnly: true,
  };
}

export { uniqueExactArtist } from "./exact";
