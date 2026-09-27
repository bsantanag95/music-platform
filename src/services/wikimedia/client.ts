// Cliente de las APIs de Wikimedia: Wikidata, Wikipedia (es, en) y Commons (openspec:
// enrich-artist-profile, ADR 0021). Es el ÚNICO punto de salida a Wikimedia: ningún otro
// módulo construye URLs de estas APIs.
//
// Reglas (política de uso de las APIs de Wikimedia, ver docs/03-data/data-licensing.md):
//   - User-Agent con contacto (`WIKIMEDIA_USER_AGENT`), o se falla cerrado.
//   - Requests en serie, con un intervalo mínimo entre ellas.
//   - `maxlag` en la API de Wikidata: si los servidores están atrasados responde un error
//     `maxlag` y se reintenta más tarde.
// Mismo supuesto de proceso único que la cola de MusicBrainz.

import type { CommonsImageInfoResponse, WDEntitiesResponse, WPExtractResponse } from "./types";

const MIN_INTERVAL_MS = 250;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;
const MAXLAG_SECONDS = "5";
/** Ancho de la miniatura de Commons: la foto se muestra chica (≤200 px, 2× para pantallas densas). */
export const COMMONS_THUMB_WIDTH = 500;

export type WikiLanguage = "es" | "en";

let queueTail: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class WikimediaConfigError extends Error {}

function requiredUserAgent(): string {
  const ua = process.env.WIKIMEDIA_USER_AGENT;
  if (!ua) {
    throw new WikimediaConfigError(
      "Falta WIKIMEDIA_USER_AGENT en las variables de entorno — es obligatorio para usar las APIs de Wikimedia.",
    );
  }
  return ua;
}

async function wikiFetch<T extends { error?: { code: string; info?: string } }>(
  base: string,
  params: Record<string, string>,
): Promise<T> {
  const userAgent = requiredUserAgent();
  return schedule(async () => {
    const url = new URL(base);
    url.searchParams.set("format", "json");
    url.searchParams.set("formatversion", "2");
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": userAgent, "Api-User-Agent": userAgent },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if ((res.status === 429 || res.status === 503) && attempt < MAX_ATTEMPTS) {
          lastError = new Error(`Wikimedia respondió ${res.status} para ${url.hostname}`);
          await sleep(attempt * 1000);
          continue;
        }
        if (!res.ok) throw new Error(`Wikimedia respondió ${res.status} para ${url.hostname}${url.pathname}`);
        const body = (await res.json()) as T;
        if (body.error?.code === "maxlag" && attempt < MAX_ATTEMPTS) {
          lastError = new Error("Wikidata con maxlag");
          await sleep(Number(res.headers.get("retry-after") ?? "5") * 1000);
          continue;
        }
        if (body.error) throw new Error(`Wikimedia devolvió ${body.error.code}: ${body.error.info ?? ""}`);
        return body;
      } catch (err) {
        const retryable = err instanceof TypeError || (err instanceof DOMException && err.name === "TimeoutError");
        if (!retryable || attempt >= MAX_ATTEMPTS) throw err;
        lastError = err;
        await sleep(attempt * 1000);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Wikimedia no respondió tras ${MAX_ATTEMPTS} intentos`);
  });
}

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const wikipediaApi = (lang: WikiLanguage) => `https://${lang}.wikipedia.org/w/api.php`;

export const wikimedia = {
  /**
   * Entidades de Wikidata con las propiedades pedidas, en español e inglés. Los sitelinks se
   * filtran a las Wikipedias de esos idiomas.
   */
  getEntities(ids: string[], props: ("claims" | "descriptions" | "labels" | "sitelinks")[]) {
    return wikiFetch<WDEntitiesResponse>(WIKIDATA_API, {
      action: "wbgetentities",
      ids: ids.join("|"),
      props: props.join("|"),
      languages: "es|en",
      sitefilter: "eswiki|enwiki",
      maxlag: MAXLAG_SECONDS,
    });
  },

  /** Introducción de un artículo en texto plano, con su URL canónica. */
  getIntroExtract(lang: WikiLanguage, title: string) {
    return wikiFetch<WPExtractResponse>(wikipediaApi(lang), {
      action: "query",
      prop: "extracts|info",
      exintro: "1",
      explaintext: "1",
      inprop: "url",
      redirects: "1",
      titles: title,
    });
  },

  /** Miniatura y metadatos de licencia de un archivo de Commons. */
  getImageInfo(fileName: string) {
    return wikiFetch<CommonsImageInfoResponse>(COMMONS_API, {
      action: "query",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: String(COMMONS_THUMB_WIDTH),
      iiextmetadatafilter: "LicenseShortName|LicenseUrl|Artist|NonFree|AttributionRequired",
      titles: `File:${fileName}`,
    });
  },
};
