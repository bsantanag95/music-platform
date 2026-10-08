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
import { activityScores } from "./activity";
import { matchLocalArtists } from "./local-match";
import { artistQuery, type ArtistTypeFilter } from "./mb-query";
import { isExactMatch, matchTier } from "./normalize";
import { localOnlyIndex, sortByRank, type RankKey } from "./rank";
import type { ArtistSearchResponse, ArtistSearchResult, CatalogArtistType } from "./types";

const LOCAL_LIMIT = 10;

export interface ArtistSearchOptions {
  artistType?: ArtistTypeFilter;
  /** Abandono de quien busca: descarta la request en cola y evita escribir stubs. */
  signal?: AbortSignal;
}

function isArtistType(value: string): value is CatalogArtistType {
  return value === "person" || value === "group" || value === "various" || value === "unknown";
}

interface Entry {
  row: ArtistRow;
  disambiguation: string | null;
  country: string | null;
  rank: RankKey;
}

function toResult(entry: Entry, query: string): ArtistSearchResult {
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
  { artistType, signal }: ArtistSearchOptions = {},
): Promise<ArtistSearchResponse> {
  const q = query.trim();
  const localRows = await matchLocalArtists(q, { limit: LOCAL_LIMIT, artistType });

  let remote: MBArtistSearchItem[] = [];
  let remoteFailed = false;
  try {
    remote = (await musicbrainz.searchArtist(artistQuery(q, artistType), { signal })).artists;
  } catch {
    remoteFailed = true;
  }
  // Abandonada: ni stubs ni respuesta.
  signal?.throwIfAborted();
  if (remoteFailed && localRows.length === 0) {
    throw new ApiError("INTERNAL_ERROR", 502, "MusicBrainz no respondió y no hay coincidencias locales");
  }

  const knownMbids = new Set(localRows.map((row) => row.mbid).filter((mbid) => mbid !== null));
  const stubbed = await upsertArtistStubsFromSearch(
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
      country: remoteItem?.country ?? null,
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
      country: item.country ?? null,
      rank: { level: 0, activity: 0, group: 1, index },
    });
  });

  // Un stub ya existente puede tener otro tipo que el filtro pedido.
  const filtered = artistType ? entries.filter((entry) => entry.row.type === artistType) : entries;
  const activity = await activityScores(
    "artist",
    filtered.map((entry) => entry.row.id),
  );
  for (const entry of filtered) {
    entry.rank.level = matchTier(entry.row.name, q);
    entry.rank.activity = activity.get(entry.row.id) ?? 0;
  }

  return {
    type: "artist",
    results: sortByRank(filtered).map((entry) => toResult(entry, q)),
    remoteFailed,
  };
}

export { uniqueExactArtist } from "./exact";
