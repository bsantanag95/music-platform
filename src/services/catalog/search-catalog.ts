import { and, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db";
import { artist, credit, release, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { musicbrainz } from "../musicbrainz/client";
import { mapReleaseGroupCategory } from "../musicbrainz/mappers";
import type { MBArtistCreditItem } from "../musicbrainz/types";
import { upsertArtistStubsFromSearch } from "./ingest-artist";
import { upsertReleaseGroupStubs } from "./ingest-release-group";
import type { ReleaseGroupCategoryValue } from "./ingest-release-group";

// Resolver de búsqueda del catálogo (openspec: add-search-results-page).
//
// Separar "buscar" de "abrir": aquí solo se listan candidatos — una request a
// MusicBrainz por tipo como máximo y CERO ingesta de discografía, tracklist o
// carátula. La ingesta pesada ocurre, como siempre, en la primera visita a
// `/artist/<id>` o `/album/<id>`. Cada candidato de MusicBrainz se persiste
// como stub (una operación por tipo) para que todo resultado enlace directo
// a su vista destino por id local.

const LOCAL_LIMIT = 10;

export type CatalogSearchKind = "artist" | "release-group";
export type CatalogArtistType = "person" | "group" | "various" | "unknown";

export interface CatalogSearchResult {
  kind: CatalogSearchKind;
  id: string;
  mbid: string | null;
  /** Nombre del artista o título del álbum. */
  name: string;
  /** Artista: disambiguation. Álbum: artista principal (si se conoce). */
  subtitle: string | null;
  /** Solo artista. */
  artistType: CatalogArtistType | null;
  /** Solo álbum. */
  category: ReleaseGroupCategoryValue | null;
  /** Solo álbum, si MusicBrainz lo trae (precisión anual basta). */
  year: number | null;
  /** Ya tenía contenido cacheado en la base local (discografía / tracklist). */
  cached: boolean;
}

interface EntryBase {
  mbid: string | null;
  name: string;
  exact: boolean;
  /** 0 = local cacheado, 1 = resto de locales, 2 = solo MusicBrainz. */
  group: number;
}

interface ArtistEntry extends EntryBase {
  kind: "artist";
  id: string;
  subtitle: string | null;
  artistType: CatalogArtistType;
}

interface AlbumEntry extends EntryBase {
  kind: "release-group";
  id: string;
  subtitle: string | null;
  category: ReleaseGroupCategoryValue;
  year: number | null;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function isArtistType(value: string): value is CatalogArtistType {
  return value === "person" || value === "group" || value === "various" || value === "unknown";
}

/**
 * Año a partir de `first-release-date` de MusicBrainz. A diferencia de
 * `normalizeReleaseDate` (columna DATE, exige precisión completa), acá solo
 * interesa el año para mostrarlo — '1985', '1985-06' y '1985-06-15' valen.
 */
function yearFromMbDate(date: string | undefined): number | null {
  const match = date ? /^(\d{4})$|^\d{4}-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?$/.exec(date) : null;
  return match ? Number(date!.slice(0, 4)) : null;
}

function joinArtistCredit(credits: MBArtistCreditItem[] | undefined): string | null {
  if (!credits?.length) return null;
  return credits.map((item) => `${item.name}${item.joinphrase ?? ""}`).join("");
}

function sortEntries(entries: (ArtistEntry | AlbumEntry)[]) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      // Cached → resto locales → solo-MusicBrainz; exacta al tope de su grupo.
      const groupDiff = a.entry.group - b.entry.group;
      if (groupDiff !== 0) return groupDiff;
      const exactDiff = Number(b.entry.exact) - Number(a.entry.exact);
      if (exactDiff !== 0) return exactDiff;
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
}

function toResult(entry: ArtistEntry | AlbumEntry): CatalogSearchResult {
  if (entry.kind === "artist") {
    return {
      kind: "artist",
      id: entry.id,
      mbid: entry.mbid,
      name: entry.name,
      subtitle: entry.subtitle,
      artistType: entry.artistType,
      category: null,
      year: null,
      cached: entry.group === 0,
    };
  }
  return {
    kind: "release-group",
    id: entry.id,
    mbid: entry.mbid,
    name: entry.name,
    subtitle: entry.subtitle,
    artistType: null,
    category: entry.category,
    year: entry.year,
    cached: entry.group === 0,
  };
}

/** "Todo" intercala artistas y álbumes preservando el orden relativo de cada tipo. */
function interleave(
  artists: CatalogSearchResult[],
  albums: CatalogSearchResult[],
): CatalogSearchResult[] {
  const combined: CatalogSearchResult[] = [];
  for (let i = 0; i < Math.max(artists.length, albums.length); i++) {
    const artistItem = artists[i];
    const albumItem = albums[i];
    if (artistItem) combined.push(artistItem);
    if (albumItem) combined.push(albumItem);
  }
  return combined;
}

/**
 * Busca artistas y álbumes que coinciden con el texto, combinando la base
 * local y MusicBrainz, deduplicados por mbid y ordenados de forma
 * determinista: locales cacheados → resto de locales → solo-MusicBrainz (por
 * score), con coincidencia exacta al tope de su grupo.
 *
 * Lanza `ApiError(INTERNAL_ERROR, 502)` si MusicBrainz falla y no hay ninguna
 * coincidencia local; si la hay, degrada a los resultados locales (200).
 */
export async function searchCatalog(query: string): Promise<CatalogSearchResult[]> {
  const q = query.trim();
  const pattern = `%${escapeLike(q)}%`;

  const localArtistRows = await db
    .select()
    .from(artist)
    .where(ilike(artist.name, pattern))
    .limit(LOCAL_LIMIT);

  const localAlbumRows = await db
    .select()
    .from(releaseGroup)
    .where(ilike(releaseGroup.title, pattern))
    .limit(LOCAL_LIMIT);

  const [artistSearch, albumSearch] = await Promise.allSettled([
    musicbrainz.searchArtist(q),
    musicbrainz.searchReleaseGroup(q),
  ]);

  const hasLocal = localArtistRows.length > 0 || localAlbumRows.length > 0;
  if (artistSearch.status === "rejected" && albumSearch.status === "rejected") {
    if (!hasLocal) {
      throw new ApiError(
        "INTERNAL_ERROR",
        502,
        "MusicBrainz no respondió y no hay coincidencias locales",
      );
    }
  }

  const mbArtists =
    artistSearch.status === "fulfilled" ? artistSearch.value.artists : [];
  const mbAlbums =
    albumSearch.status === "fulfilled"
      ? albumSearch.value["release-groups"]
      : [];

  // Stubs: una operación por tipo, solo para candidatos aún no vistos.
  const knownArtistMbids = new Set(
    localArtistRows.map((row) => row.mbid).filter((mbid): mbid is string => mbid !== null),
  );
  const knownAlbumMbids = new Set(
    localAlbumRows.map((row) => row.mbid).filter((mbid): mbid is string => mbid !== null),
  );

  const stubbedArtists = await upsertArtistStubsFromSearch(
    mbArtists
      .filter((item) => !knownArtistMbids.has(item.id))
      .map((item) => ({
        mbid: item.id,
        name: item.name,
        mbType: item.type,
        disambiguation: item.disambiguation ?? null,
      })),
  );
  const stubbedAlbums = await upsertReleaseGroupStubs(
    mbAlbums
      .filter((item) => !knownAlbumMbids.has(item.id))
      .map((item) => ({
        mbid: item.id,
        title: item.title,
        category: mapReleaseGroupCategory(
          item["primary-type"],
          item["secondary-types"],
        ),
      })),
  );

  const artistByMbid = new Map(stubbedArtists.map((row) => [row.mbid, row]));
  const albumByMbid = new Map(stubbedAlbums.map((row) => [row.mbid, row]));

  // Señales de "ya cacheado" para lo local: artista con discografía sincronizada;
  // álbum con al menos un release ingerido (tracklist de una visita previa).
  const albumIdsWithContent = new Set(
    (
      await db
        .select({ releaseGroupId: release.releaseGroupId })
        .from(release)
        .where(
          inArray(
            release.releaseGroupId,
            localAlbumRows.map((row) => row.id),
          ),
        )
    ).map((row) => row.releaseGroupId),
  );

  // Artista principal de los álbumes locales (posición 0 del crédito primario).
  const primaryArtistByAlbum = new Map(
    localAlbumRows.length === 0
      ? []
      : (
          await db
            .select({
              releaseGroupId: credit.releaseGroupId,
              name: artist.name,
            })
            .from(credit)
            .innerJoin(artist, eq(artist.id, credit.artistId))
            .where(
              and(
                inArray(
                  credit.releaseGroupId,
                  localAlbumRows.map((row) => row.id),
                ),
                eq(credit.role, "primary"),
                eq(credit.position, 0),
              )
            )
        ).map((row) => [row.releaseGroupId, row.name] as const),
  );

  const artistEntries: ArtistEntry[] = localArtistRows.map((row) => ({
    kind: "artist",
    id: row.id,
    mbid: row.mbid,
    name: row.name,
    subtitle: row.bio,
    artistType: isArtistType(row.type) ? row.type : "unknown",
    exact: row.name.toLowerCase() === q.toLowerCase(),
    group: row.discographySyncedAt ? 0 : 1,
  }));

  const localArtistByMbid = new Map(
    artistEntries
      .filter((entry): entry is ArtistEntry & { mbid: string } => entry.mbid !== null)
      .map((entry) => [entry.mbid, entry]),
  );

  for (const item of mbArtists) {
    const local = localArtistByMbid.get(item.id);
    if (local) {
      local.subtitle ??= item.disambiguation ?? null;
      continue;
    }
    const row = artistByMbid.get(item.id);
    if (!row) continue;
    artistEntries.push({
      kind: "artist",
      id: row.id,
      mbid: item.id,
      name: row.name,
      subtitle: item.disambiguation ?? null,
      artistType: isArtistType(row.type) ? row.type : "unknown",
      exact: item.name.toLowerCase() === q.toLowerCase(),
      group: 2,
    });
  }

  const albumEntries: AlbumEntry[] = localAlbumRows.map((row) => ({
    kind: "release-group",
    id: row.id,
    mbid: row.mbid,
    name: row.title,
    subtitle: primaryArtistByAlbum.get(row.id) ?? null,
    category: row.category as ReleaseGroupCategoryValue,
    year: null,
    exact: row.title.toLowerCase() === q.toLowerCase(),
    group: albumIdsWithContent.has(row.id) ? 0 : 1,
  }));

  const localAlbumByMbid = new Map(
    albumEntries
      .filter((entry): entry is AlbumEntry & { mbid: string } => entry.mbid !== null)
      .map((entry) => [entry.mbid, entry]),
  );

  for (const item of mbAlbums) {
    const local = localAlbumByMbid.get(item.id);
    const year = yearFromMbDate(item["first-release-date"]);
    const subtitle = joinArtistCredit(item["artist-credit"]);
    if (local) {
      local.year ??= year;
      local.subtitle ??= subtitle;
      continue;
    }
    const row = albumByMbid.get(item.id);
    if (!row) continue;
    albumEntries.push({
      kind: "release-group",
      id: row.id,
      mbid: item.id,
      name: row.title,
      subtitle,
      category: row.category as ReleaseGroupCategoryValue,
      year,
      exact: item.title.toLowerCase() === q.toLowerCase(),
      group: 2,
    });
  }

  const artists = sortEntries(artistEntries).map(toResult);
  const albums = sortEntries(albumEntries).map(toResult);
  return interleave(artists, albums);
}
