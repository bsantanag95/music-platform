import { and, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db";
import { artist, credit, recording, release, releaseGroup } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { musicbrainz } from "../musicbrainz/client";
import { mapReleaseGroupCategory, yearFromMbDate } from "../musicbrainz/mappers";
import type { MBArtistCreditItem, MBRecordingSearchItem } from "../musicbrainz/types";
import { upsertArtistStubsFromSearch } from "./ingest-artist";
import { upsertReleaseGroupStubs } from "./ingest-release-group";
import type { ReleaseGroupCategoryValue } from "./ingest-release-group";
import {
  albumsFromMbReleases,
  findOrIngestRecording,
  localAppearanceAlbums,
  localRecordingArtistName,
  sortSongContextAlbums,
  type SongContextAlbum,
} from "./ingest-recording";

// Resolver de búsqueda del catálogo (openspec: add-search-results-page +
// add-recording-album-search).
//
// Separar "buscar" de "abrir": aquí solo se listan candidatos — una request a
// MusicBrainz por tipo como máximo y CERO ingesta de discografía, tracklist o
// carátula. La ingesta pesada ocurre, como siempre, en la primera visita a
// `/artist/<id>` o `/album/<id>`. Cada candidato de MusicBrainz se persiste
// como stub (una operación por tipo) para que todo resultado enlace directo
// a su vista destino por id local.
//
// La canción NO es un resultado navegable: si la consulta coincide con una
// grabación (local primero, MusicBrainz después), se resuelven los álbumes que
// la contienen y se devuelven como `songContext` — una sección contextual de
// /search. Un fallo en esta pata se traga en silencio: artistas y álbumes se
// sirven exactamente como antes.

const LOCAL_LIMIT = 10;
const SONG_CONTEXT_ALBUM_LIMIT = 12;

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

export interface CatalogSongContextAlbum {
  /** `id` local del release_group — enlazable a `/album/<id>`. */
  id: string;
  mbid: string | null;
  title: string;
  category: ReleaseGroupCategoryValue;
  year: number | null;
}

/** Contexto "álbumes que contienen «canción»" (openspec: catalog-search). */
export interface CatalogSongContext {
  /** `id` local de la grabación detectada (no se enlaza: la canción no es resultado). */
  recordingId: string;
  mbid: string | null;
  title: string;
  artistName: string | null;
  albums: CatalogSongContextAlbum[];
}

export interface CatalogSearchResponse {
  results: CatalogSearchResult[];
  /** Opcional: se omite si no hay canción relevante o si su pata falló. */
  songContext?: CatalogSongContext;
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

// ---------- Resolución canción → álbumes (openspec: add-recording-album-search)

// Candidatos (versiones de la misma canción) que se browséan y cuyas
// apariciones se unen: MB fragmenta una canción en tomas de estudio, lives,
// remixes y malvinculaciones, y ninguna grabación individual tiene todas las
// apariciones. Cada browse queda cacheado por mbid con la TTL de búsquedas.
const CANDIDATE_BROWSE_LIMIT = 4;
const RGID_CLAUSE_LIMIT = 120;

const SONG_RG_CATEGORY_ORDER: Record<ReleaseGroupCategoryValue, number> = {
  studio: 0,
  single_ep: 1,
  compilation: 2,
  live_other: 3,
};

function normalizeForMatch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

interface ArtistHintCandidate {
  name: string;
  mbid: string | null;
  /** `id` local del artista, si existe (para buscar sus release_groups propios). */
  localId: string | null;
}

interface SongQuery {
  /** Texto de la consulta sin la parte de artista, en minúsculas. */
  songPart: string;
  /** Artista reconocido dentro de `q`, si lo hay. */
  hint: ArtistHintCandidate | null;
}

/**
 * Parte la consulta en (canción, artista). El hint SOLO se toma de candidatos
 * de artista ya reconocidos en esta búsqueda (locales o devueltos por la pata
 * de artistas de MusicBrainz) y debe estar contenido literalmente en `q`;
 * así "sabrina carpenter taste" deja "taste" como canción y a Sabrina
 * Carpenter como contexto. Si la consulta es solo el nombre del artista, no
 * hay canción que resolver.
 */
function deriveSongQuery(q: string, artists: ArtistHintCandidate[]): SongQuery | null {
  const normalizedQ = normalizeForMatch(q);
  if (normalizedQ.length < 3) return null;

  let hint: ArtistHintCandidate | null = null;
  let hintLength = 0;
  for (const candidate of artists) {
    const normalized = normalizeForMatch(candidate.name);
    if (normalized.length < 3) continue;
    if (!normalizedQ.includes(normalized)) continue;
    if (!hint || normalized.length > hintLength) {
      hint = candidate;
      hintLength = normalized.length;
    }
  }

  if (hint) {
    const songPart = normalizeForMatch(
      normalizedQ.replace(normalizeForMatch(hint.name), " "),
    );
    // Una canción de 1-2 caracteres no es señal suficiente: sin section.
    if (songPart.length >= 2) return { songPart, hint };
  }
  return { songPart: normalizedQ, hint: null };
}

/** Escapa un texto para usarlo como frase entre comillas en la sintaxis de búsqueda de MB. */
function escapeLucenePhrase(value: string): string {
  return value.replace(/(["\\])/g, "\\$1");
}

/**
 * Query de recordings. Con hint de artista se buscan grabaciones cuyo TÍTULO
 * coincide, indexadas DENTRO de los release-groups propios del artista
 * (`rgid:` = "MBID de cualquier release group que incluya esta grabación").
 * Por qué así y no `artist:"..."` (verificado contra datos reales 2026-09):
 *   - `artist:` busca por NOMBRE del crédito y está contaminado por bandas de
 *     cover acreditadas literalmente como el artista real, y
 *   - la grabación de estudio de "Stairway to Heaven" NO tiene artist-credit
 *     en MusicBrainz (defecto de datos), así que ninguna consulta por artista
 *     la encuentra, mientras que el rgid de [Led Zeppelin IV] sí.
 * Sin lista de rgids disponibles se degrada a la query por nombre (peor, pero
 * mejor que nada); sin hint, texto libre.
 */
function recordingSearchQuery(songQuery: SongQuery, rgMbids: string[]): string {
  if (!songQuery.hint) return songQuery.songPart;
  const titleClause = `"${escapeLucenePhrase(songQuery.songPart)}"`;
  if (rgMbids.length > 0) {
    const clause = rgMbids.slice(0, RGID_CLAUSE_LIMIT).map((mbid) => `rgid:${mbid}`).join(" OR ");
    return `${titleClause} AND (${clause})`;
  }
  return `${titleClause} AND artist:"${escapeLucenePhrase(normalizeForMatch(songQuery.hint.name))}"`;
}

/**
 * Filtro de relevancia D4: el título de la grabación está contenido en la
 * parte de canción de la consulta, o viceversa (normalizados). En el segundo
 * caso se toleran como máximo 2 tokens extra en el título: sin eso, un título
 * "sabrina carpenter - taste (dudda bootleg)" pasaría por "taste" solo por
 * contenerlo. MusicBrainz devuelve recordings para casi cualquier texto; sin
 * este filtro habría secciones absurdas.
 */
function isRelevantRecordingTitle(songPart: string, title: string): boolean {
  const normalizedPart = normalizeForMatch(songPart);
  const normalizedTitle = normalizeForMatch(title);
  if (!normalizedPart || !normalizedTitle) return false;
  if (normalizedPart.includes(normalizedTitle)) return true;
  if (normalizedTitle.includes(normalizedPart)) {
    const partTokens = new Set(normalizedPart.split(" "));
    const extraTokens = normalizedTitle
      .split(" ")
      .filter((token) => !partTokens.has(token)).length;
    return extraTokens <= 2;
  }
  return false;
}

function seedFromCandidate(item: MBRecordingSearchItem) {
  return {
    mbid: item.id,
    title: item.title,
    durationSec: typeof item.length === "number" ? Math.round(item.length / 1000) : null,
    credits: item["artist-credit"] ?? [],
  };
}

/**
 * Una contribución al contexto: una `recording` (local o recién resuelta) con
 * las apariciones que se le conocen. `releaseCount` decide la identidad del
 * contexto (la grabación canónica es la de más apariciones); para
 * contribuciones locales vale el número de apariciones ingeridas.
 */
interface SongContribution {
  row: { id: string; mbid: string | null; title: string };
  artistName: string | null;
  releaseCount: number;
  appearances: SongContextAlbum[];
}

function buildSongContext(
  row: { id: string; mbid: string | null; title: string },
  artistName: string | null,
  albums: CatalogSongContextAlbum[],
): CatalogSongContext {
  return {
    recordingId: row.id,
    mbid: row.mbid,
    title: row.title,
    artistName,
    albums,
  };
}

function toSongContextAlbums(
  albums: SongContextAlbum[],
  excludedReleaseGroupIds: Set<string>,
): CatalogSongContextAlbum[] {
  return sortSongContextAlbums(albums)
    .filter((album) => !excludedReleaseGroupIds.has(album.releaseGroupId))
    .slice(0, SONG_CONTEXT_ALBUM_LIMIT)
    .map((album) => ({
      id: album.releaseGroupId,
      mbid: album.mbid,
      title: album.title,
      category: album.category,
      year: album.year,
    }));
}

/**
 * Unión de apariciones de varias contribuciones: dedupe por release_group
 * conservando el año no-nulo más antiguo (cada fuente puede conocer pren-
 * siones distintas; la de estudio con tracklist ingerido localmente aporta lo
 * que la página de 100 de MB pudo truncar, y viceversa).
 */
function mergeAppearances(contributions: SongContribution[]): SongContextAlbum[] {
  const merged = new Map<string, SongContextAlbum>();
  for (const contribution of contributions) {
    for (const album of contribution.appearances) {
      const known = merged.get(album.releaseGroupId);
      if (!known) {
        merged.set(album.releaseGroupId, { ...album });
        continue;
      }
      if (album.year !== null && (known.year === null || album.year < known.year)) {
        known.year = album.year;
      }
    }
  }
  return [...merged.values()];
}

/**
 * Fuente local: `recording`s cuyo título coincide con la parte de canción y
 * que ya tienen apariciones ingeridas (tracklists de álbumes visitados). Ya
 * NO es un camino exclusivo: devuelve todas sus contribuciones para la unión
 * del orquestador. Con hint de artista se exige además que el crédito
 * primario lo incluya. Las grabaciones stub creadas por una búsqueda previa
 * no tienen tracks y no aportan nada acá.
 */
async function resolveLocalContributions(
  songQuery: SongQuery,
): Promise<SongContribution[]> {
  const pattern = `%${escapeLike(songQuery.songPart)}%`;
  const candidates = await db
    .select()
    .from(recording)
    .where(ilike(recording.title, pattern))
    .limit(LOCAL_LIMIT);

  // Coincidencia exacta con la parte de canción primero.
  const ordered = [...candidates].sort(
    (a, b) =>
      Number(normalizeForMatch(b.title) === songQuery.songPart) -
      Number(normalizeForMatch(a.title) === songQuery.songPart),
  );

  const contributions: SongContribution[] = [];
  for (const candidate of ordered) {
    if (!isRelevantRecordingTitle(songQuery.songPart, candidate.title)) continue;
    const appearances = await localAppearanceAlbums(candidate.id);
    if (appearances.length === 0) continue;
    const artistName = await localRecordingArtistName(candidate.id);
    if (songQuery.hint) {
      const normalizedArtist = artistName ? normalizeForMatch(artistName) : "";
      const hint = normalizeForMatch(songQuery.hint.name);
      if (!normalizedArtist.includes(hint) && !hint.includes(normalizedArtist)) continue;
    }
    contributions.push({ row: candidate, artistName, releaseCount: appearances.length, appearances });
  }
  return contributions;
}

/**
 * Mbids de los release-groups PROPIOS del artista hint: primero los locales
 * (créditos ya ingeridos — si alguien visitó el perfil del artista, coste
 * cero); si no hay, un browse de discografía (el mismo que usa el perfil de
 * artista, hasta 100). Ordenados por categoría (los álbumes de estudio — donde
 * vive la grabación canónica de una canción — al principio) porque la cláusula
 * Lucene tiene tope de longitud y no se puede truncar en orden de uuid: un
 * corte arbitrario dejó fuera [Led Zeppelin IV]/Short n' Sweet en la
 * verificación inicial. Vacío => la query fría degrada a `artist:"nombre"`.
 */
async function artistReleaseGroupMbids(hint: ArtistHintCandidate): Promise<string[]> {
  const byCategory = new Map<string, ReleaseGroupCategoryValue>();

  if (hint.localId) {
    const localRows = await db
      .select({ mbid: releaseGroup.mbid, category: releaseGroup.category })
      .from(credit)
      .innerJoin(releaseGroup, eq(releaseGroup.id, credit.releaseGroupId))
      .where(eq(credit.artistId, hint.localId));
    for (const row of localRows) {
      if (row.mbid) byCategory.set(row.mbid, row.category as ReleaseGroupCategoryValue);
    }
  }

  if (byCategory.size === 0 && hint.mbid) {
    try {
      const browse = await musicbrainz.browseReleaseGroupsByArtist(hint.mbid);
      for (const rg of browse["release-groups"]) {
        if (typeof rg.id !== "string") continue;
        byCategory.set(
          rg.id,
          mapReleaseGroupCategory(rg["primary-type"], rg["secondary-types"]),
        );
      }
    } catch {
      // Sin discografía no hay cláusula rgid: la query fría degrada sola.
      return [];
    }
  }

  return [...byCategory.entries()]
    .sort((a, b) => {
      const categoryDiff = SONG_RG_CATEGORY_ORDER[a[1]] - SONG_RG_CATEGORY_ORDER[b[1]];
      if (categoryDiff !== 0) return categoryDiff;
      return a[0].localeCompare(b[0]);
    })
    .map(([mbid]) => mbid);
}

/**
 * Fuente fría (MusicBrainz): se toman los primeros K candidatos que pasan el
 * filtro de título (candidato = cualquier versión: el dominio propio trata la
 * canción como una entidad que acumula apariciones; MB la fragmenta en tomas
 * de estudio, lives, remixes y malvinculaciones) y se browsea CADA uno (los
 * browse están cacheados por mbid con la TTL de búsquedas: el coste completo
 * es del primer golpe). Las apariciones de todos se unen en el orquestador;
 * `release-count` del browse solo decide cuál es la grabación IDENTIDAD del
 * contexto (la canónica), que es la única que se ingiere — una sola ingesta
 * de grabación por búsqueda.
 *
 * Con hint de artista la búsqueda de recordings se acota a sus
 * release-groups propios (cláusula `rgid:`, ver `recordingSearchQuery`).
 *
 * Persiste stubs de `release_group` vía `albumsFromMbReleases` — nunca
 * releases ni tracks. Cualquier fallo devuelve []: la búsqueda de
 * artistas/álbumes no se entera y la fuente local sigue aportando.
 */
async function resolveColdContributions(
  songQuery: SongQuery,
): Promise<SongContribution[]> {
  try {
    const rgMbids = songQuery.hint ? await artistReleaseGroupMbids(songQuery.hint) : [];
    const search = await musicbrainz.searchRecording(recordingSearchQuery(songQuery, rgMbids));
    const seen = new Set<string>();
    const candidates: MBRecordingSearchItem[] = [];
    for (const item of search.recordings) {
      if (candidates.length >= CANDIDATE_BROWSE_LIMIT) break;
      if (seen.has(item.id)) continue;
      if (!isRelevantRecordingTitle(songQuery.songPart, item.title)) continue;
      seen.add(item.id);
      candidates.push(item);
    }
    if (candidates.length === 0) return [];

    const contributions: SongContribution[] = [];
    let winner: { item: MBRecordingSearchItem; count: number } | null = null;

    for (const item of candidates) {
      const browse = await musicbrainz.browseReleasesByRecording(item.id);
      const appearances = await albumsFromMbReleases(browse.releases);
      const count = browse["release-count"] ?? appearances.length;
      if (appearances.length === 0) continue;

      const [existing] = await db
        .select()
        .from(recording)
        .where(eq(recording.mbid, item.id))
        .limit(1);

      contributions.push({
        row: existing ?? { id: item.id, mbid: item.id, title: item.title },
        artistName: item["artist-credit"]?.[0]?.name ?? null,
        releaseCount: count,
        appearances,
      });
      if (!winner || count > winner.count) winner = { item, count };
    }
    if (!winner) return [];

    // La identidad del contexto se materializa localmente (única ingesta de
    // grabación de esta búsqueda); los demás candidatos quedan efímeros.
    const [existingWinner] = await db
      .select()
      .from(recording)
      .where(eq(recording.mbid, winner.item.id))
      .limit(1);
    const winnerRow = existingWinner ?? (await findOrIngestRecording(seedFromCandidate(winner.item)));
    const winnerArtistName = await localRecordingArtistName(winnerRow.id);

    return contributions.map((contribution) =>
      contribution.row.mbid === winner.item.id
        ? {
            ...contribution,
            row: winnerRow,
            artistName: winnerArtistName ?? contribution.artistName,
          }
        : contribution,
    );
  } catch {
    // La canción es contexto, no el objetivo principal de /search: un fallo
    // aquí nunca puede convertir una búsqueda válida en un 502.
    return [];
  }
}

/**
 * Orquestador: une las dos fuentes. Identidad = la contribución de mayor
 * release-count (la canónica). Si MusicBrainz cae, la unión queda solo con
 * las apariciones locales (degradación explícita); sin ninguna fuente, no hay
 * sección.
 */
async function resolveSongContext(
  q: string,
  artists: ArtistHintCandidate[],
  excludedReleaseGroupIds: Set<string>,
): Promise<CatalogSongContext | null> {
  const songQuery = deriveSongQuery(q, artists);
  if (!songQuery) return null;

  const [local, cold] = await Promise.all([
    resolveLocalContributions(songQuery).catch(() => [] as SongContribution[]),
    resolveColdContributions(songQuery),
  ]);
  const contributions = [...local, ...cold];
  if (contributions.length === 0) return null;

  const albums = toSongContextAlbums(mergeAppearances(contributions), excludedReleaseGroupIds);
  if (albums.length === 0) return null;

  const identity = contributions.reduce((best, current) =>
    current.releaseCount > best.releaseCount ? current : best,
  );
  return buildSongContext(identity.row, identity.artistName, albums);
}

/**
 * Busca artistas y álbumes que coinciden con el texto, combinando la base
 * local y MusicBrainz, deduplicados por mbid y ordenados de forma
 * determinista: locales cacheados → resto de locales → solo-MusicBrainz (por
 * score), con coincidencia exacta al tope de su grupo.
 *
 * Lanza `ApiError(INTERNAL_ERROR, 502)` si MusicBrainz falla y no hay ninguna
 * coincidencia local; si la hay, degrada a los resultados locales (200). La
 * pata de grabaciones (`songContext`) es aditiva: su fallo nunca modifica lo
 * anterior — simplemente se omite la clave.
 */
export async function searchCatalog(query: string): Promise<CatalogSearchResponse> {
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
  const results = interleave(artists, albums);

  // D5: un álbum que ya figura en `results` como coincidencia de título no se
  // repite dentro del contexto de canción.
  const excludedReleaseGroupIds = new Set(
    albums.filter((album) => album.kind === "release-group").map((album) => album.id),
  );
  // Candidatos de artista ya reconocidos (locales + MusicBrainz): de acá sale
  // el hint que acota la búsqueda de recordings a los álbumes propios del
  // artista (cláusula rgid).
  const artistCandidates: ArtistHintCandidate[] = artistEntries.map((entry) => ({
    name: entry.name,
    mbid: entry.mbid,
    localId: entry.id,
  }));
  const songContext = await resolveSongContext(q, artistCandidates, excludedReleaseGroupIds);

  return songContext ? { results, songContext } : { results };
}
