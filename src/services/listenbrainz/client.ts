// Cliente de la API de ListenBrainz (openspec: add-home-release-calendar, ADR 0029). Es el ÚNICO
// punto de salida a ListenBrainz: ningún otro módulo construye URLs de esta API.
//
// Reglas (ver docs/03-data/data-licensing.md):
//   - User-Agent con contacto (`LISTENBRAINZ_USER_AGENT`), o se falla cerrado.
//   - Requests en serie, con un intervalo mínimo entre ellas, y reintento ante 429/503.
// Se usan dos endpoints públicos (sin token): el feed "Fresh Releases" y la popularidad de
// artistas. Los datos son CC0 y provienen de MusicBrainz (mismos MBID).
// Mismo supuesto de proceso único que la cola de MusicBrainz.

const LB_BASE_URL = "https://api.listenbrainz.org/1";
const MIN_INTERVAL_MS = 500;
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
/** Máximo de días por lado que acepta el feed "Fresh Releases". */
export const FRESH_RELEASES_MAX_DAYS = 90;
/** Tamaño de lote de la consulta de popularidad. */
export const POPULARITY_BATCH_SIZE = 500;

/** Fila del feed `/explore/fresh-releases/`: una por release-group. */
export interface LBFreshRelease {
  artist_credit_name: string;
  artist_mbids: string[];
  /** Id de la imagen en Cover Art Archive; `null` si ninguna edición tiene carátula. */
  caa_id: number | null;
  caa_release_mbid: string | null;
  /** Siempre 0 en el feed general (prueba del 2026-10-06): no sirve como señal. */
  listen_count: number;
  release_date: string; // 'YYYY-MM-DD'
  release_group_mbid: string;
  release_group_primary_type?: string | null;
  release_mbid: string;
  release_name: string;
  release_tags?: string[];
}

export interface LBFreshReleasesResponse {
  payload: { releases: LBFreshRelease[]; total_count?: number };
}

export interface LBArtistPopularity {
  artist_mbid: string;
  total_listen_count: number | null;
  total_user_count: number | null;
}

export class ListenBrainzConfigError extends Error {}

let queueTail: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const result = queueTail.then(async () => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < MIN_INTERVAL_MS) await sleep(MIN_INTERVAL_MS - elapsed);
    lastRequestAt = Date.now();
    return task();
  });
  queueTail = result.catch(() => undefined);
  return result;
}

function requiredUserAgent(): string {
  const ua = process.env.LISTENBRAINZ_USER_AGENT;
  if (!ua) {
    throw new ListenBrainzConfigError(
      "Falta LISTENBRAINZ_USER_AGENT en las variables de entorno — es obligatorio para usar la API de ListenBrainz.",
    );
  }
  return ua;
}

async function lbFetch<T>(path: string, init: { params?: Record<string, string>; body?: unknown } = {}): Promise<T> {
  const userAgent = requiredUserAgent();
  return schedule(async () => {
    const url = new URL(`${LB_BASE_URL}${path}`);
    for (const [key, value] of Object.entries(init.params ?? {})) url.searchParams.set(key, value);

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, {
          method: init.body === undefined ? "GET" : "POST",
          headers: {
            "User-Agent": userAgent,
            ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
          },
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if ((res.status === 429 || res.status === 503) && attempt < MAX_ATTEMPTS) {
          lastError = new Error(`ListenBrainz respondió ${res.status} para ${url.pathname}`);
          await sleep(Number(res.headers.get("retry-after") ?? attempt) * 1000);
          continue;
        }
        if (!res.ok) throw new Error(`ListenBrainz respondió ${res.status} para ${url.pathname}`);
        return (await res.json()) as T;
      } catch (err) {
        const retryable = err instanceof TypeError || (err instanceof DOMException && err.name === "TimeoutError");
        if (!retryable || attempt >= MAX_ATTEMPTS) throw err;
        lastError = err;
        await sleep(attempt * 1000);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`ListenBrainz no respondió tras ${MAX_ATTEMPTS} intentos`);
  });
}

export const listenbrainz = {
  /**
   * Lanzamientos alrededor de `pivot` (YYYY-MM-DD): `days` (≤ 90) hacia atrás y/o hacia adelante
   * según `past`/`future`. Devuelve una fila por release-group.
   */
  async freshReleases(input: { pivot: string; days: number; past: boolean; future: boolean }): Promise<LBFreshRelease[]> {
    const days = Math.min(Math.max(Math.trunc(input.days), 1), FRESH_RELEASES_MAX_DAYS);
    const body = await lbFetch<LBFreshReleasesResponse>("/explore/fresh-releases/", {
      params: {
        release_date: input.pivot,
        days: String(days),
        past: String(input.past),
        future: String(input.future),
        sort: "release_date",
      },
    });
    return body.payload?.releases ?? [];
  },

  /**
   * Oyentes y escuchas totales por artista, en lotes de `POPULARITY_BATCH_SIZE`. Los artistas
   * sin datos vuelven con `null`.
   */
  async artistPopularity(artistMbids: string[]): Promise<LBArtistPopularity[]> {
    const unique = [...new Set(artistMbids)];
    const results: LBArtistPopularity[] = [];
    for (let i = 0; i < unique.length; i += POPULARITY_BATCH_SIZE) {
      const batch = unique.slice(i, i + POPULARITY_BATCH_SIZE);
      results.push(
        ...(await lbFetch<LBArtistPopularity[]>("/popularity/artist", { body: { artist_mbids: batch } })),
      );
    }
    return results;
  },
};
