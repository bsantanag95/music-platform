// Búsqueda del tipo Álbumes (openspec: redesign-scoped-search).
//
// Presupuesto: UNA solicitud a MusicBrainz por página (dos solo con separador
// explícito y el primer orden sin resultados). La consulta en texto libre de
// MusicBrainz ya cubre artista + título ("kiss destroyer" → Destroyer de
// KISS); el orden final lo decide la cobertura de términos, así que da igual
// en qué orden se escriban.

import { ApiError } from "@/lib/api/errors";
import type { ReleaseGroupRow } from "@/db/schema";
import { musicbrainz } from "../../musicbrainz/client";
import { mapReleaseGroupCategory, yearFromMbDate } from "../../musicbrainz/mappers";
import type {
  MBArtistCreditItem,
  MBReleaseGroupSearchItem,
  MBReleaseGroupSearchResponse,
} from "../../musicbrainz/types";
import { ingestReleaseGroupCreditsBatch } from "../ingest-discography";
import { upsertReleaseGroupStubs, type ReleaseGroupCategoryValue } from "../ingest-release-group";
import { activityScores, albumCommunity, exploredScores } from "./activity";
import {
  catalogAlbumPage,
  hasCatalogFields,
  matchedGenres,
  primaryArtistCountries,
  resolveCatalogFields,
  withoutUnresolved,
  type AlbumCatalogFilters,
  type ResolvedCatalogFields,
} from "./catalog-fields";
import { coverageLevel, edgeSplits, restAfterEdgeArtist } from "./coverage";
import {
  findArtistsByKeys,
  matchLocalReleaseGroups,
  primaryArtistsByReleaseGroup,
  releaseGroupsByArtists,
  releaseGroupsByArtistsAndTitle,
  releaseGroupsWithContent,
} from "./local-match";
import { releaseGroupFieldQuery, releaseGroupQuery, type ReleaseGroupQueryOptions } from "./mb-query";
import { isExactMatch, splitExplicit, tokenize, withoutSeparator } from "./normalize";
import { localOnlyIndex, sortByRank, topArtistNames, type RankKey } from "./rank";
import {
  GENERIC_QUERY_THRESHOLD,
  REFINE_ARTIST_LIMIT,
  type AlbumSearchResponse,
  type AlbumSearchResult,
} from "./types";

const LOCAL_LIMIT = 10;

export interface AlbumSearchOptions {
  /** Una categoría (pastilla de /search o el diálogo "Añadir"). */
  category?: ReleaseGroupCategoryValue;
  /** Varias categorías (búsqueda avanzada); reemplaza a `category`. */
  categories?: ReleaseGroupCategoryValue[];
  /** Primer año de la década (1970, 1980, …). Un rango de años la reemplaza. */
  decade?: number;
  /** Rango de años y artista (openspec: add-advanced-search-phase1). */
  yearFrom?: number;
  yearTo?: number;
  artist?: string;
  /** Coincidencias exactas de título y artista (openspec: redesign-advanced-search). */
  exact?: boolean;
  artistExact?: boolean;
  offset?: number;
  /**
   * Solo coincidencias locales, sin MusicBrainz ni escrituras: lo que la
   * página pinta al instante mientras la pata remota llega por streaming.
   */
  localOnly?: boolean;
  /** Abandono de quien busca: descarta las requests en cola y evita escribir stubs. */
  signal?: AbortSignal;
  /**
   * Campos del catálogo (openspec: add-catalog-search-fields): con alguno válido, la búsqueda entera sale de la base
   * propia, paginada, sin MusicBrainz (`catalogOnly`).
   */
  catalog?: AlbumCatalogFilters;
}

function joinArtistCredit(credits: MBArtistCreditItem[] | undefined): string | null {
  if (!credits?.length) return null;
  return credits.map((item) => `${item.name}${item.joinphrase ?? ""}`).join("");
}

/** Año dentro del rango pedido (rango de años o década: `filters` nunca trae los dos). */
function inYears(year: number | null, { decade, yearFrom, yearTo }: ReleaseGroupQueryOptions): boolean {
  const from = yearFrom ?? decade;
  const to = yearTo ?? (decade !== undefined ? decade + 9 : undefined);
  if (from === undefined && to === undefined) return true;
  return year !== null && (from === undefined || year >= from) && (to === undefined || year <= to);
}

/**
 * Candidatos locales: por título contra la consulta completa y, si un artista
 * local ocupa un extremo de la consulta, los álbumes de ese artista cuyo
 * título coincide con el resto ("dokken back for the attack").
 */
async function localCandidates(text: string, filters: ReleaseGroupQueryOptions) {
  const byTitle = await matchLocalReleaseGroups(text, { limit: LOCAL_LIMIT, ...filters });
  // Título exacto o sin título (solo criterios): no hay artista que buscar en la consulta.
  if (filters.exact || !text) return byTitle;

  const tokens = tokenize(text);
  // La consulta completa es el nombre de un artista local ("pink floyd"): sus discos. Los álbumes
  // que se llaman igual ya vienen por título; sin esto, los homónimos desplazan la discografía.
  const wholeQueryArtists = tokens.length > 0 ? await findArtistsByKeys([tokens.join(" ")]) : [];
  const byWholeArtist = await releaseGroupsByArtists(
    wholeQueryArtists.map((artistRow) => artistRow.id),
    { limit: LOCAL_LIMIT, ...filters },
  );
  const keys = [...new Set(edgeSplits(tokens).map((split) => split.artistTokens.join(" ")))];
  const edgeArtists = await findArtistsByKeys(keys);
  const byArtist: ReleaseGroupRow[] = [];
  for (const edgeArtist of edgeArtists) {
    const rest = restAfterEdgeArtist(tokens, edgeArtist.name);
    if (!rest) continue;
    const matches = await releaseGroupsByArtistsAndTitle([edgeArtist.id], rest.join(" "), {
      limit: LOCAL_LIMIT,
      mode: "fuzzy",
      ...filters,
    });
    byArtist.push(...matches.map((match) => match.row));
  }

  const seen = new Set<string>();
  return [...byWholeArtist, ...byArtist, ...byTitle].filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

async function remotePage(
  query: string,
  filters: ReleaseGroupQueryOptions,
  offset: number,
  signal: AbortSignal | undefined,
): Promise<MBReleaseGroupSearchResponse> {
  // Con título exacto, la consulta es el título entero: sin lectura "Artista - Título".
  const explicit = filters.exact ? null : splitExplicit(query);
  if (!explicit) {
    return musicbrainz.searchReleaseGroup(releaseGroupQuery(query, filters), { offset, signal });
  }
  // "Artista - Título" o "Título - Artista": se prueba el primer orden y,
  // solo si no trae nada, el inverso.
  const first = await musicbrainz.searchReleaseGroup(
    releaseGroupFieldQuery(explicit.left, explicit.right, filters),
    { offset, signal },
  );
  if (first["release-groups"].length > 0 || offset > 0) return first;
  return musicbrainz.searchReleaseGroup(
    releaseGroupFieldQuery(explicit.right, explicit.left, filters),
    { offset, signal },
  );
}

interface Entry {
  result: AlbumSearchResult;
  artistNames: string[];
  rank: RankKey;
}

export async function searchAlbums(
  query: string,
  {
    category,
    categories = category ? [category] : undefined,
    decade,
    yearFrom,
    yearTo,
    artist,
    exact,
    artistExact,
    offset = 0,
    localOnly = false,
    signal,
    catalog,
  }: AlbumSearchOptions = {},
): Promise<AlbumSearchResponse> {
  const q = query.trim();
  const text = exact ? q : withoutSeparator(q);
  const hasRange = yearFrom !== undefined || yearTo !== undefined;
  const filters: ReleaseGroupQueryOptions = {
    categories,
    decade: hasRange ? undefined : decade,
    yearFrom,
    yearTo,
    artist,
    exact: exact && q ? true : undefined,
    artistExact: artistExact && artist ? true : undefined,
  };

  if (catalog && hasCatalogFields(catalog)) {
    const resolved = await resolveCatalogFields(catalog);
    const fields = withoutUnresolved(catalog, resolved);
    if (hasCatalogFields(fields)) return catalogAlbums(text, filters, fields, resolved, offset);
  }

  // Lo local solo acompaña a la primera página: "Cargar más" pagina MusicBrainz.
  const localRows = offset === 0 ? await localCandidates(text, filters) : [];

  let remote: MBReleaseGroupSearchItem[] = [];
  let total: number | null = null;
  let remoteFailed = false;
  if (!localOnly) {
    try {
      const page = await remotePage(q, filters, offset, signal);
      remote = page["release-groups"];
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
  const newRemote = remote.filter((item) => !knownMbids.has(item.id));
  const stubbed = await upsertReleaseGroupStubs(
    newRemote.map((item) => ({
      mbid: item.id,
      title: item.title,
      category: mapReleaseGroupCategory(item["primary-type"], item["secondary-types"]),
      firstReleaseDate: item["first-release-date"],
    })),
  );
  const stubByMbid = new Map(stubbed.map((row) => [row.mbid, row]));
  signal?.throwIfAborted();

  // Los stubs de búsqueda traen el crédito sin costo de red: se ingiere para
  // que el álbum tenga artista principal aunque se agregue a una lista sin
  // pasar por su página (mismo criterio que la búsqueda anterior). En lote y
  // solo para los álbumes aún sin créditos (openspec: speed-up-search).
  await ingestReleaseGroupCreditsBatch(
    newRemote.flatMap((item) => {
      const row = stubByMbid.get(item.id);
      return row && item["artist-credit"]?.length ? [{ releaseGroupId: row.id, credits: item["artist-credit"] }] : [];
    }),
  );

  const localIds = localRows.map((row) => row.id);
  const [primaryArtists, withContent] = await Promise.all([
    primaryArtistsByReleaseGroup(localIds),
    releaseGroupsWithContent(localIds),
  ]);
  const remoteByMbid = new Map(remote.map((item) => [item.id, item]));
  const remoteIndex = new Map(remote.map((item, index) => [item.id, index]));

  const entries: Entry[] = localRows.map((row, index) => {
    const remoteItem = row.mbid ? remoteByMbid.get(row.mbid) : undefined;
    const artists = primaryArtists.get(row.id)?.map((artist) => artist.name) ?? [];
    const cached = withContent.has(row.id);
    return {
      result: {
        kind: "release-group",
        id: row.id,
        mbid: row.mbid,
        title: row.title,
        artistName: artists.length ? artists.join(", ") : joinArtistCredit(remoteItem?.["artist-credit"]),
        category: row.category as ReleaseGroupCategoryValue,
        year: row.firstReleaseYear ?? yearFromMbDate(remoteItem?.["first-release-date"]),
        cached,
      },
      artistNames: artists,
      rank: {
        level: 0,
        activity: 0,
        popularity: remoteItem?.count ?? 0,
        group: cached ? 0 : 1,
        index: (row.mbid ? remoteIndex.get(row.mbid) : undefined) ?? localOnlyIndex(index),
      },
    };
  });
  remote.forEach((item, index) => {
    if (knownMbids.has(item.id)) return;
    const row = stubByMbid.get(item.id);
    if (!row) return;
    const credits = item["artist-credit"] ?? [];
    entries.push({
      result: {
        kind: "release-group",
        id: row.id,
        mbid: item.id,
        title: row.title,
        artistName: joinArtistCredit(credits),
        category: row.category as ReleaseGroupCategoryValue,
        year: yearFromMbDate(item["first-release-date"]),
        cached: false,
      },
      artistNames: credits.map((credit) => credit.name),
      rank: { level: 0, activity: 0, popularity: item.count ?? 0, group: 1, index },
    });
  });

  // Las cláusulas de MusicBrainz son una aproximación: el filtro exacto se
  // reaplica sobre la categoría mapeada y el año conocido. El artista ya lo
  // filtraron las dos fuentes (SQL y `artist:"…"`).
  // Las frases de MusicBrainz traen también títulos y nombres más largos: los exactos se reaplican.
  const filtered = entries.filter(
    (entry) =>
      (!categories || categories.includes(entry.result.category)) &&
      inYears(entry.result.year, filters) &&
      (!filters.exact || isExactMatch(entry.result.title, q)) &&
      (!filters.artistExact || entry.artistNames.some((name) => isExactMatch(name, artist ?? ""))),
  );
  const ids = filtered.map((entry) => entry.result.id);
  const [activity, explored, community] = await Promise.all([
    activityScores("release-group", ids),
    exploredScores("release-group", ids),
    albumCommunity(ids),
  ]);
  for (const entry of filtered) {
    entry.rank.level = coverageLevel(text, entry.result.title, entry.artistNames);
    entry.rank.activity = activity.get(entry.result.id) ?? 0;
    entry.rank.known = explored.get(entry.result.id) ?? 0;
    entry.result.community = community.get(entry.result.id) ?? { average: null, count: 0 };
  }
  const ranked = sortByRank(filtered);

  const hasArtistMatch = ranked.some((entry) => entry.rank.level === 1);
  const refine =
    q && offset === 0 && !hasArtistMatch && total !== null && total > GENERIC_QUERY_THRESHOLD
      ? {
          total,
          artists: topArtistNames(
            ranked.map((entry) => entry.artistNames[0] ?? null),
            REFINE_ARTIST_LIMIT,
          ),
        }
      : null;
  const fetched = offset + remote.length;

  return {
    type: "album",
    results: ranked.map((entry) => entry.result),
    remoteFailed,
    total,
    nextOffset: total !== null && remote.length > 0 && fetched < total ? fetched : null,
    refine,
    catalogOnly: false,
  };
}

/**
 * Álbumes solo del catálogo (openspec: add-catalog-search-fields): una página de 25 en el orden de la base, con la
 * cifra exacta, sin MusicBrainz ni stubs. Con un género o un país del artista, cada fila trae el que coincidió.
 */
async function catalogAlbums(
  text: string,
  filters: ReleaseGroupQueryOptions,
  fields: AlbumCatalogFilters,
  resolved: ResolvedCatalogFields,
  offset: number,
): Promise<AlbumSearchResponse> {
  const page = await catalogAlbumPage(text, filters, fields, resolved, offset);
  const ids = page.rows.map((row) => row.id);
  const [primaryArtists, withContent, community, genres, countries] = await Promise.all([
    primaryArtistsByReleaseGroup(ids),
    releaseGroupsWithContent(ids),
    albumCommunity(ids),
    resolved.genreId ? matchedGenres(ids, resolved.genreId) : new Map(),
    fields.artistCountry ? primaryArtistCountries(ids, fields.artistCountry) : new Map<string, string>(),
  ]);
  return {
    type: "album",
    results: page.rows.map((row) => {
      const artists = primaryArtists.get(row.id)?.map((artist) => artist.name) ?? [];
      return {
        kind: "release-group",
        id: row.id,
        mbid: row.mbid,
        title: row.title,
        artistName: artists.length ? artists.join(", ") : null,
        category: row.category as ReleaseGroupCategoryValue,
        year: row.firstReleaseYear,
        cached: withContent.has(row.id),
        community: community.get(row.id) ?? { average: null, count: 0 },
        genre: genres.get(row.id) ?? null,
        artistCountry: countries.get(row.id) ?? null,
      };
    }),
    remoteFailed: false,
    total: page.total,
    nextOffset: page.nextOffset,
    refine: null,
    catalogOnly: true,
  };
}
