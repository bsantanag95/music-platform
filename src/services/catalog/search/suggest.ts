// Sugerencias del buscador mientras se escribe (openspec:
// redesign-scoped-search, capacidad search-typeahead).
//
// Presupuesto de MusicBrainz: CERO. Solo lecturas de la base propia (índices
// trigram de la migración 0050), para que el desplegable responda al instante
// y muchas búsquedas terminen acá, sin pasar por /search.

import { and, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { activeUserCondition } from "@/services/auth/account-status";
import { resolveImageUrls } from "@/services/storage/avatar-urls";
import { activityScores, type ActivityKind } from "./activity";
import { edgeSplits, restAfterEdgeArtist } from "./coverage";
import {
  findArtistsByKeys,
  matchLocalArtists,
  matchLocalReleaseGroups,
  primaryArtistsByReleaseGroup,
  rankByMatchTier,
  releaseGroupsByArtistsAndTitle,
} from "./local-match";
import { escapeLike, matchTier, normalizeSearchText, tokenize, withoutSeparator } from "./normalize";
import { songSuggestions as rankedSongSuggestions } from "./song-suggestions";
import type { CatalogArtistType, SearchType } from "./types";

export const SUGGESTION_LIMIT = 6;
/** Candidatos que se piden antes de desempatar por actividad. */
const SUGGESTION_POOL = 40;
export const MIN_SUGGEST_LENGTH = 2;

export type SearchSuggestion =
  | {
      kind: "artist";
      id: string;
      name: string;
      artistType: CatalogArtistType;
      disambiguation: string | null;
    }
  | {
      kind: "album";
      id: string;
      title: string;
      artistName: string | null;
      year: number | null;
      /** Vino del puente artista + título (se marca con su tipo en Artistas). */
      bridge: boolean;
    }
  | { kind: "song"; id: string; title: string; artistName: string | null }
  | {
      kind: "user";
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    };

/**
 * Orden de sugerencias: nivel de coincidencia (exacta → palabra completa →
 * prefijo → resto) y, a igualdad, actividad en la plataforma y contenido ya
 * cacheado. Sin esto "sabr" mostraba seis homónimos "Sabrina" (más similares
 * por ser más cortos) antes que Sabrina Carpenter.
 */
async function rankSuggestionRows<T extends { id: string }>(
  rows: T[],
  kind: ActivityKind,
  text: string,
  name: (row: T) => string,
  cached: (row: T) => boolean = () => false,
): Promise<T[]> {
  const activity = await activityScores(kind, rows.map((row) => row.id));
  return rows
    .map((row, index) => ({
      row,
      index,
      tier: matchTier(name(row), text),
      activity: activity.get(row.id) ?? 0,
      cached: cached(row) ? 0 : 1,
    }))
    .sort((a, b) => a.tier - b.tier || b.activity - a.activity || a.cached - b.cached || a.index - b.index)
    .map(({ row }) => row);
}

function isArtistType(value: string): value is CatalogArtistType {
  return value === "person" || value === "group" || value === "various" || value === "unknown";
}

/**
 * Puente artista + título: si un artista local ocupa un extremo de la
 * consulta, sus álbumes cuyo título EMPIEZA por el resto ("dokken back for"
 * → Back for the Attack). Prefijo, porque la persona todavía está escribiendo.
 */
async function bridgeAlbums(text: string, limit: number) {
  const tokens = tokenize(text);
  if (tokens.length < 2) return [];
  const keys = [...new Set(edgeSplits(tokens).map((split) => split.artistTokens.join(" ")))];
  const artists = await findArtistsByKeys(keys);
  const matches = [];
  for (const artist of artists) {
    const rest = restAfterEdgeArtist(tokens, artist.name);
    if (!rest) continue;
    const rows = await releaseGroupsByArtistsAndTitle([artist.id], rest.join(" "), { limit, mode: "prefix" });
    matches.push(...rows.map(({ row }) => ({ row, artistName: artist.name })));
  }
  return matches.slice(0, limit);
}

async function albumSuggestions(text: string, bridgeOnly: boolean): Promise<SearchSuggestion[]> {
  const bridged = await bridgeAlbums(text, SUGGESTION_LIMIT);
  const byTitle = bridgeOnly
    ? []
    : await rankSuggestionRows(
        await matchLocalReleaseGroups(text, { limit: SUGGESTION_POOL }),
        "release-group",
        text,
        (row) => row.title,
      );
  const seen = new Set<string>();
  const rows = [
    ...bridged.map(({ row, artistName }) => ({ row, artistName, bridge: true })),
    ...byTitle.map((row) => ({ row, artistName: null as string | null, bridge: false })),
  ].filter(({ row }) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  const artists = await primaryArtistsByReleaseGroup(rows.map(({ row }) => row.id));
  return rows.slice(0, SUGGESTION_LIMIT).map(({ row, artistName, bridge }) => ({
    kind: "album",
    id: row.id,
    title: row.title,
    artistName: artistName ?? artists.get(row.id)?.map((artist) => artist.name).join(", ") ?? null,
    year: row.firstReleaseYear,
    bridge,
  }));
}

async function artistSuggestions(text: string): Promise<SearchSuggestion[]> {
  const [artists, albums] = await Promise.all([
    matchLocalArtists(text, { limit: SUGGESTION_POOL }).then((rows) =>
      rankSuggestionRows(rows, "artist", text, (row) => row.name, (row) => row.discographySyncedAt !== null),
    ),
    albumSuggestions(text, true),
  ]);
  const artistRows: SearchSuggestion[] = artists.slice(0, SUGGESTION_LIMIT).map((row) => ({
    kind: "artist",
    id: row.id,
    name: row.name,
    artistType: isArtistType(row.type) ? row.type : "unknown",
    disambiguation: row.disambiguation,
  }));
  // Las filas puente van primero: si la consulta nombra artista + álbum, es
  // más específica que cualquier artista que solo contenga el texto.
  return [...albums, ...artistRows].slice(0, SUGGESTION_LIMIT);
}

/** Agrupadas por canción, con puente artista + canción (openspec: improve-song-suggestions). */
async function songSuggestions(text: string): Promise<SearchSuggestion[]> {
  const rows = await rankedSongSuggestions(text, SUGGESTION_LIMIT);
  return rows.map((row) => ({ kind: "song", id: row.id, title: row.title, artistName: row.artistName }));
}

async function userSuggestions(text: string): Promise<SearchSuggestion[]> {
  const pattern = `%${escapeLike(text)}%`;
  const fuzzy = (column: typeof appUser.username | typeof appUser.displayName) =>
    or(
      sql`search_normalize(${column}) % search_normalize(${text})`,
      sql`search_normalize(${column}) LIKE search_normalize(${pattern})`,
    );
  const rows = await db
    .select({
      id: appUser.id,
      username: appUser.username,
      displayName: appUser.displayName,
      avatarImageId: appUser.avatarImageId,
    })
    .from(appUser)
    .where(and(or(fuzzy(appUser.username), fuzzy(appUser.displayName)), activeUserCondition()))
    .orderBy(sql`similarity(search_normalize(${appUser.username}), search_normalize(${text})) DESC`)
    .limit(SUGGESTION_LIMIT * 3);
  const ranked = rankByMatchTier(rows, (row) => row.username, text).slice(0, SUGGESTION_LIMIT);
  const avatars = await resolveImageUrls(ranked.map((row) => row.avatarImageId));
  return ranked.map((row) => ({
    kind: "user",
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarImageId ? (avatars.get(row.avatarImageId) ?? null) : null,
  }));
}

export async function suggest(type: SearchType, query: string): Promise<SearchSuggestion[]> {
  const text = withoutSeparator(query.trim());
  if (normalizeSearchText(text).length < MIN_SUGGEST_LENGTH) return [];
  if (type === "artist") return artistSuggestions(text);
  if (type === "album") return albumSuggestions(text, false);
  if (type === "song") return songSuggestions(text);
  return userSuggestions(text);
}
