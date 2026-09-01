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
  MBReleaseGroupWithReleases,
  MBRelease,
} from "./types";

const MB_BASE_URL = "https://musicbrainz.org/ws/2";
const MIN_INTERVAL_MS = 1100; // margen sobre el límite de 1 req/seg

let queueTail: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const result = queueTail.then(async () => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < MIN_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
    }
    lastRequestAt = Date.now();
    return task();
  });
  // Nunca dejamos que un error de una tarea rompa la cola para las siguientes.
  queueTail = result.catch(() => undefined);
  return result;
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function mbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
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
  });
}

export const musicbrainz = {
  searchArtist(query: string) {
    return mbFetch<MBArtistSearchResponse>("/artist", { query });
  },

  /** Detalle básico de un artista ya conocido por id — para enriquecer stubs sin arriesgar un match distinto por nombre. */
  getArtist(mbid: string) {
    return mbFetch<MBArtistSummary>(`/artist/${mbid}`, {});
  },

  getArtistWithRelations(mbid: string) {
    return mbFetch<MBArtistDetail>(`/artist/${mbid}`, { inc: "artist-rels" });
  },

  /** Álbumes/EPs/singles etc. donde este artista aparece como crédito. */
  browseReleaseGroupsByArtist(artistMbid: string) {
    return mbFetch<MBReleaseGroupBrowseResponse>("/release-group", {
      artist: artistMbid,
      limit: "100",
      inc: "artist-credits",
    });
  },

  getReleaseGroup(mbid: string) {
    return mbFetch<MBReleaseGroupWithReleases>(`/release-group/${mbid}`, {
      inc: "releases",
    });
  },

  getRelease(mbid: string) {
    return mbFetch<MBRelease>(`/release/${mbid}`, {
      inc: "recordings+artist-credits",
    });
  },
};
