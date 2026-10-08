// Cliente de la API en vivo de MusicBrainz.
//
// Reglas obligatorias (ver docs/03-data/data-licensing.md):
//   - Máximo 1 request/segundo.
//   - User-Agent identificable (nombre de la app + contacto), o se cae
//     en el bucket de clientes "anónimos" y recibe throttling agresivo.
//
// Nota de escalabilidad: esta cola es en memoria de un solo proceso. En
// un deploy con más de una instancia sirviendo tráfico, dos instancias
// distintas seguirían pudiendo sumar más de 1 req/seg entre ambas. Para
// ese escenario hace falta un limitador distribuido (ej. token bucket en
// Redis, ya previsto en docs/02-architecture/architecture.md). Para el
// alcance de la Fase 2 esta cola en memoria es suficiente.

import type {
  MBArtistSummary,
  MBArtistDetail,
  MBArtistSearchResponse,
  MBReleaseGroupBrowseResponse,
  MBReleaseGroupSearchResponse,
  MBRelease,
  MBRecordingSearchResponse,
  MBReleaseBrowseResponse,
  MBReleaseBrowseByGroupResponse,
} from "./types";

const MB_BASE_URL = "https://musicbrainz.org/ws/2";
const MIN_INTERVAL_MS = 1100; // margen sobre el límite de 1 req/seg

/** Tamaño de página máximo que acepta MusicBrainz en un browse. */
export const RELEASE_BROWSE_PAGE_SIZE = 100;

/** MBID por búsqueda `rgid:(…)`: deja la URL holgada y entra en una página. */
export const RELEASE_GROUP_MBID_BATCH = 50;

let queueTail: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

/**
 * `promise`, pero rechazada en cuanto `signal` se aborta, sin esperarla (openspec:
 * speed-up-quick-actions-search). `onAbort` corre antes del rechazo.
 */
function abandonable<T>(promise: Promise<T>, signal: AbortSignal, onAbort?: () => void): Promise<T> {
  if (signal.aborted) {
    onAbort?.();
    return Promise.reject(signal.reason);
  }
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      onAbort?.();
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (err: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(err);
      },
    );
  });
}

/**
 * Encola `task` respetando el intervalo mínimo. Si `signal` se aborta antes de que llegue su
 * turno, la tarea se descarta sin emitir la request ni consumir el intervalo: una búsqueda
 * abandonada no hace esperar a la siguiente. Una request ya emitida termina igual (cortarla no
 * devuelve el turno ya pagado y perdería una respuesta que la caché aprovecha).
 */
function schedule<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  const result = queueTail.then(async () => {
    signal?.throwIfAborted();
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < MIN_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
    }
    signal?.throwIfAborted();
    lastRequestAt = Date.now();
    return task();
  });
  // Nunca dejamos que un error de una tarea rompa la cola para las siguientes.
  queueTail = result.catch(() => undefined);
  return signal ? abandonable(result, signal) : result;
}

function requiredUserAgent(): string {
  const ua = process.env.MUSICBRAINZ_USER_AGENT;
  if (!ua) {
    throw new Error(
      "Falta MUSICBRAINZ_USER_AGENT en las variables de entorno — es obligatorio para usar la API de MusicBrainz.",
    );
  }
  return ua;
}

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;

// Caché TTL de RESPUESTAS DE BÚSQUEDA (searchArtist/searchReleaseGroup/
// searchRecording) y del browse de apariciones de una grabación
// (browseReleasesByRecording). Cada re-render del servidor de /search (p. ej.
// cambio de idioma) repetía las búsquedas, pagando cada vez la cola de rate
// limit + red. La misma consulta dentro de la TTL se sirve desde memoria y las
// llamadas concurrentes idénticas comparten el mismo request en vuelo.
// browseReleasesByRecording se cachea igual que una búsqueda porque alimenta la
// sección contextual "álbumes que contienen «canción»" de /search: es dato
// efímero de contexto, no ingesta. Los get/browse de ingestas siguen siempre a
// MusicBrainz porque su respuesta alimenta datos que queremos frescos al abrir
// una entidad. Mismo supuesto de proceso único que la cola; fallidos no se
// cachean.
const SEARCH_CACHE_TTL_MS = 10 * 60_000;
const SEARCH_CACHE_MAX = 200;

// Cancelación (openspec: speed-up-quick-actions-search): cada entrada cuenta las búsquedas que
// la esperan. Quien llama sin señal no puede abandonarla y la retiene; cuando todas las que sí
// pueden la abandonan antes de su turno en la cola, la request se descarta y sale de la caché.

interface SearchCacheEntry {
  key: string;
  promise: Promise<unknown>;
  expiresAt: number;
  waiters: number;
  controller: AbortController;
}

const searchCache = new Map<string, SearchCacheEntry>();

function releaseWaiter(entry: SearchCacheEntry): void {
  entry.waiters -= 1;
  if (entry.waiters > 0) return;
  // Fuera de la caché antes de abortar: una búsqueda nueva de la misma clave emite su propia
  // request en vez de recibir la cancelación de otra.
  if (searchCache.get(entry.key) === entry) searchCache.delete(entry.key);
  entry.controller.abort();
}

function joinSearch<T>(entry: SearchCacheEntry, signal: AbortSignal | undefined): Promise<T> {
  entry.waiters += 1;
  const promise = entry.promise as Promise<T>;
  return signal ? abandonable(promise, signal, () => releaseWaiter(entry)) : promise;
}

function cachedSearch<T>(
  key: string,
  task: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const now = Date.now();
  const hit = searchCache.get(key);
  if (hit && hit.expiresAt > now) {
    return joinSearch<T>(hit, signal);
  }
  if (searchCache.size >= SEARCH_CACHE_MAX) {
    const oldest = searchCache.keys().next();
    if (!oldest.done) searchCache.delete(oldest.value);
  }
  const controller = new AbortController();
  const promise = task(controller.signal);
  const entry: SearchCacheEntry = { key, promise, expiresAt: now + SEARCH_CACHE_TTL_MS, waiters: 0, controller };
  searchCache.set(key, entry);
  // Un fallo (o un descarte) no debe quedar en la caché: el próximo request reintenta.
  promise.catch(() => {
    if (searchCache.get(key) === entry) searchCache.delete(key);
  });
  return joinSearch<T>(entry, signal);
}

/** Limpia la caché de búsquedas — solo para tests. */
export function clearMusicBrainzSearchCacheForTests(): void {
  searchCache.clear();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Página de una búsqueda: MusicBrainz acepta hasta 100 por página; por defecto 25. */
export interface SearchPage {
  limit?: number;
  offset?: number;
}

/**
 * Página más la señal de quien busca: si todas las búsquedas que esperan la misma request la
 * abandonan antes de su turno en la cola, la request no se emite.
 */
export interface SearchOptions extends SearchPage {
  signal?: AbortSignal;
}

const DEFAULT_SEARCH_LIMIT = 25;
const MAX_SEARCH_LIMIT = 100;

function resolvePage({ limit, offset }: SearchPage): { limit: string; offset: string } {
  const safeLimit = Math.min(Math.max(Math.trunc(limit ?? DEFAULT_SEARCH_LIMIT), 1), MAX_SEARCH_LIMIT);
  const safeOffset = Math.max(Math.trunc(offset ?? 0), 0);
  return { limit: String(safeLimit), offset: String(safeOffset) };
}

async function mbFetch<T>(
  path: string,
  params: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<T> {
  return schedule(async () => {
    const url = new URL(`${MB_BASE_URL}${path}`);
    url.searchParams.set("fmt", "json");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": requiredUserAgent() },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        // 503 = throttling / servicio temporalmente no disponible: reintentable.
        if (res.status === 503 && attempt < MAX_ATTEMPTS) {
          lastError = new Error(`MusicBrainz respondió 503 para ${url.pathname}`);
          await sleep(attempt * MIN_INTERVAL_MS);
          continue;
        }

        if (!res.ok) {
          throw new Error(`MusicBrainz respondió ${res.status} para ${url.pathname}`);
        }

        return (await res.json()) as T;
      } catch (err) {
        // fetch lanza TypeError ("fetch failed") ante fallos de red / socket
        // keep-alive muerto tras un rato de inactividad, y TimeoutError si se
        // agota el tiempo. Ambos son transitorios: reintentamos con backoff.
        const retryable =
          err instanceof TypeError ||
          (err instanceof DOMException && err.name === "TimeoutError");
        if (!retryable || attempt >= MAX_ATTEMPTS) {
          throw err;
        }
        lastError = err;
        await sleep(attempt * MIN_INTERVAL_MS);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`MusicBrainz no respondió tras ${MAX_ATTEMPTS} intentos`);
  }, signal);
}

export const musicbrainz = {
  /** Búsqueda de artistas por texto (sintaxis Lucene) — página de `limit` desde `offset`. */
  searchArtist(query: string, page: SearchOptions = {}) {
    const { limit, offset } = resolvePage(page);
    return cachedSearch(
      `searchArtist|${query}|${limit}|${offset}`,
      (signal) => mbFetch<MBArtistSearchResponse>("/artist", { query, limit, offset }, signal),
      page.signal,
    );
  },

  /** Búsqueda de álbumes/EPs/singles por texto — solo candidatos, sin releases ni tracklist. */
  searchReleaseGroup(query: string, page: SearchOptions = {}) {
    const { limit, offset } = resolvePage(page);
    return cachedSearch(
      `searchReleaseGroup|${query}|${limit}|${offset}`,
      (signal) =>
        mbFetch<MBReleaseGroupSearchResponse>(
          "/release-group",
          { query, limit, offset, inc: "artist-credits" },
          signal,
        ),
      page.signal,
    );
  },

  /**
   * Varios release-groups por MBID en una sola request (`rgid:(A OR B …)`), con tipos secundarios,
   * `first-release-date` y créditos: verifica los finalistas del calendario de lanzamientos
   * (openspec: add-home-release-calendar). Hasta `RELEASE_GROUP_MBID_BATCH` por llamada. Sin caché:
   * el resultado se persiste en el calendario. El índice de búsqueda puede ir atrasado respecto de
   * la base, así que un MBID ausente no significa que no exista.
   */
  searchReleaseGroupsByMbid(mbids: string[]) {
    if (mbids.length === 0) return Promise.resolve({ "release-groups": [] } as MBReleaseGroupSearchResponse);
    if (mbids.length > RELEASE_GROUP_MBID_BATCH) {
      throw new Error(`searchReleaseGroupsByMbid acepta hasta ${RELEASE_GROUP_MBID_BATCH} MBID por llamada`);
    }
    return mbFetch<MBReleaseGroupSearchResponse>("/release-group", {
      query: `rgid:(${mbids.join(" OR ")})`,
      limit: String(mbids.length),
      inc: "artist-credits",
    });
  },

  /** Búsqueda de grabaciones por texto — solo candidatos, para resolver "artista + canción" hacia sus álbumes. */
  searchRecording(query: string, page: SearchOptions = {}) {
    const { limit, offset } = resolvePage(page);
    return cachedSearch(
      `searchRecording|${query}|${limit}|${offset}`,
      (signal) =>
        mbFetch<MBRecordingSearchResponse>("/recording", { query, limit, offset, inc: "artist-credits" }, signal),
      page.signal,
    );
  },

  /**
   * Ediciones (releases) donde aparece una grabación, con su release-group
   * embebido. Una sola página de 100: es contexto de búsqueda, no la fuente de
   * verdad de las apariciones de la canción.
   */
  browseReleasesByRecording(recordingMbid: string, signal?: AbortSignal) {
    return cachedSearch(
      `browseReleasesByRecording|${recordingMbid}`,
      (taskSignal) =>
        mbFetch<MBReleaseBrowseResponse>(
          "/release",
          { recording: recordingMbid, limit: "100", inc: "release-groups" },
          taskSignal,
        ),
      signal,
    );
  },

  /** Detalle básico de un artista ya conocido por id — para enriquecer stubs sin arriesgar un match distinto por nombre. */
  getArtist(mbid: string) {
    return mbFetch<MBArtistSummary>(`/artist/${mbid}`, {});
  },

  /**
   * Artista con sus pertenencias (`artist-rels`) y sus enlaces (`url-rels`) en una sola
   * request: la misma respuesta trae país, áreas y fechas para la ficha (openspec:
   * enrich-artist-profile). Ninguna request pide `genres` ni `tags` a MusicBrainz (datos
   * CC BY-NC-SA): los géneros salen de Wikidata P136 (ADR 0023).
   */
  getArtistWithRelations(mbid: string) {
    return mbFetch<MBArtistDetail>(`/artist/${mbid}`, { inc: "artist-rels+url-rels" });
  },

  /**
   * Álbumes/EPs/singles etc. donde este artista aparece como crédito, de a 100.
   * `release-group-status=website-default` es el criterio del sitio de MusicBrainz:
   * excluye los release-groups que solo tienen ediciones bootleg (openspec:
   * fix-artist-discography-ingestion). `url-rels` trae en la misma request la relación
   * `wikidata` de cada álbum, base de sus géneros semilla (openspec: add-genre-taxonomy).
   */
  browseReleaseGroupsByArtist(artistMbid: string, offset = 0, signal?: AbortSignal) {
    return mbFetch<MBReleaseGroupBrowseResponse>(
      "/release-group",
      {
        artist: artistMbid,
        limit: String(RELEASE_BROWSE_PAGE_SIZE),
        offset: String(offset),
        inc: "artist-credits+url-rels",
        "release-group-status": "website-default",
      },
      signal,
    );
  },

  /**
   * Todas las ediciones de un release-group, de a 100 (el lookup del grupo con
   * `inc=releases` devuelve como máximo 25). Trae sellos y catálogo, formato y
   * recuento de pistas por disco, y el release-group embebido con su
   * `first-release-date` (openspec: enrich-album-editions-and-credits).
   */
  browseReleasesByReleaseGroup(releaseGroupMbid: string, offset = 0) {
    return mbFetch<MBReleaseBrowseByGroupResponse>("/release", {
      "release-group": releaseGroupMbid,
      limit: String(RELEASE_BROWSE_PAGE_SIZE),
      offset: String(offset),
      inc: "labels+media+release-groups",
    });
  },

  getRelease(mbid: string) {
    // `artist-rels+recording-level-rels`: créditos de personal de la edición y de
    // cada grabación en la MISMA request que la tracklist (sin requests extra).
    // `work-rels+work-level-rels`: la obra de cada grabación con sus autores
    // (compositores, letristas), también en la misma request (openspec:
    // add-songwriter-credits).
    return mbFetch<MBRelease>(`/release/${mbid}`, {
      inc: "recordings+artist-credits+artist-rels+recording-level-rels+work-rels+work-level-rels",
    });
  },
};
