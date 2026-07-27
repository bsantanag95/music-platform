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

async function mbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  return schedule(async () => {
    const url = new URL(`${MB_BASE_URL}${path}`);
    url.searchParams.set("fmt", "json");
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const res = await fetch(url, {
      headers: { "User-Agent": requiredUserAgent() },
    });

    if (!res.ok) {
      throw new Error(`MusicBrainz respondió ${res.status} para ${url.pathname}`);
    }

    return (await res.json()) as T;
  });
}

export const musicbrainz = {
  searchArtist(query: string) {
    return mbFetch<MBArtistSearchResponse>("/artist", { query });
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
