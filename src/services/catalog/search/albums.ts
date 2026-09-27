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
import { ingestCredits } from "../ingest-discography";
import { upsertReleaseGroupStubs, type ReleaseGroupCategoryValue } from "../ingest-release-group";
import { activityScores } from "./activity";
import { coverageLevel, edgeSplits, restAfterEdgeArtist } from "./coverage";
import {
  findArtistsByKeys,
  matchLocalReleaseGroups,
  primaryArtistsByReleaseGroup,
  releaseGroupsByArtistsAndTitle,
  releaseGroupsWithContent,
} from "./local-match";
import { releaseGroupFieldQuery, releaseGroupQuery, type ReleaseGroupQueryOptions } from "./mb-query";
import { splitExplicit, tokenize, withoutSeparator } from "./normalize";
import { localOnlyIndex, sortByRank, topArtistNames, type RankKey } from "./rank";
import {
  GENERIC_QUERY_THRESHOLD,
  REFINE_ARTIST_LIMIT,
  type AlbumSearchResponse,
  type AlbumSearchResult,
} from "./types";

const LOCAL_LIMIT = 10;

export interface AlbumSearchOptions {
  category?: ReleaseGroupCategoryValue;
  /** Primer año de la década (1970, 1980, …). */
  decade?: number;
  offset?: number;
  /**
   * Solo coincidencias locales, sin MusicBrainz ni escrituras: lo que la
   * página pinta al instante mientras la pata remota llega por streaming.
   */
  localOnly?: boolean;
}

function joinArtistCredit(credits: MBArtistCreditItem[] | undefined): string | null {
  if (!credits?.length) return null;
  return credits.map((item) => `${item.name}${item.joinphrase ?? ""}`).join("");
}

function inDecade(year: number | null, decade: number | undefined): boolean {
  if (decade === undefined) return true;
  return year !== null && year >= decade && year <= decade + 9;
}

/**
 * Candidatos locales: por título contra la consulta completa y, si un artista
 * local ocupa un extremo de la consulta, los álbumes de ese artista cuyo
 * título coincide con el resto ("dokken back for the attack").
 */
async function localCandidates(text: string, filters: ReleaseGroupQueryOptions) {
  const byTitle = await matchLocalReleaseGroups(text, { limit: LOCAL_LIMIT, ...filters });

  const tokens = tokenize(text);
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
  return [...byArtist, ...byTitle].filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

async function remotePage(
  query: string,
  filters: ReleaseGroupQueryOptions,
  offset: number,
): Promise<MBReleaseGroupSearchResponse> {
  const explicit = splitExplicit(query);
  if (!explicit) {
    return musicbrainz.searchReleaseGroup(releaseGroupQuery(query, filters), { offset });
  }
  // "Artista - Título" o "Título - Artista": se prueba el primer orden y,
  // solo si no trae nada, el inverso.
  const first = await musicbrainz.searchReleaseGroup(
    releaseGroupFieldQuery(explicit.left, explicit.right, filters),
    { offset },
  );
  if (first["release-groups"].length > 0 || offset > 0) return first;
  return musicbrainz.searchReleaseGroup(
    releaseGroupFieldQuery(explicit.right, explicit.left, filters),
    { offset },
  );
}

interface Entry {
  result: AlbumSearchResult;
  artistNames: string[];
  rank: RankKey;
}

export async function searchAlbums(
  query: string,
  { category, decade, offset = 0, localOnly = false }: AlbumSearchOptions = {},
): Promise<AlbumSearchResponse> {
  const q = query.trim();
  const text = withoutSeparator(q);
  const filters: ReleaseGroupQueryOptions = { category, decade };

  // Lo local solo acompaña a la primera página: "Cargar más" pagina MusicBrainz.
  const localRows = offset === 0 ? await localCandidates(text, filters) : [];

  let remote: MBReleaseGroupSearchItem[] = [];
  let total: number | null = null;
  let remoteFailed = false;
  if (!localOnly) {
    try {
      const page = await remotePage(q, filters, offset);
      remote = page["release-groups"];
      total = page.count ?? null;
    } catch {
      remoteFailed = true;
    }
  }
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

  // Los stubs de búsqueda traen el crédito sin costo de red: se ingiere para
  // que el álbum tenga artista principal aunque se agregue a una lista sin
  // pasar por su página (mismo criterio que la búsqueda anterior).
  for (const item of newRemote) {
    const row = stubByMbid.get(item.id);
    if (row && item["artist-credit"]?.length) {
      await ingestCredits(item["artist-credit"], { releaseGroupId: row.id });
    }
  }

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
      rank: { level: 0, activity: 0, group: 1, index },
    });
  });

  // Las cláusulas de MusicBrainz son una aproximación: el filtro exacto se
  // reaplica sobre la categoría mapeada y el año conocido.
  const filtered = entries.filter(
    (entry) =>
      (!category || entry.result.category === category) && inDecade(entry.result.year, decade),
  );
  const activity = await activityScores(
    "release-group",
    filtered.map((entry) => entry.result.id),
  );
  for (const entry of filtered) {
    entry.rank.level = coverageLevel(text, entry.result.title, entry.artistNames);
    entry.rank.activity = activity.get(entry.result.id) ?? 0;
  }
  const ranked = sortByRank(filtered);

  const hasArtistMatch = ranked.some((entry) => entry.rank.level === 1);
  const refine =
    offset === 0 && !hasArtistMatch && total !== null && total > GENERIC_QUERY_THRESHOLD
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
  };
}
