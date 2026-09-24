/**
 * Parámetros del espejo propio de carátulas (openspec: mirror-cover-art).
 * Fuente única: no dispersar constantes en la resolución, la conversión ni
 * los scripts operativos.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const COVER_MIRROR = {
  /** Lado mayor del WebP espejado. La fuente ya es `front-250`. */
  maxDimension: 250,
  /** Calidad WebP de recodificación (~8,7 KB → ~5 KB). */
  webpQuality: 80,
  /** Un `null` cacheado no se re-consulta hasta que pasen estos días. */
  negativeRetryDays: 7,
  /** Umbral por defecto de la revalidación contra la fuente. */
  revalidateDays: 90,
  /** Timeout del `GET` que sigue las redirecciones de CAA. */
  fetchTimeoutMs: 8_000,
  /** Requests concurrentes del backfill (no martillar archive.org). */
  backfillConcurrency: 2,
} as const;

export const NEGATIVE_RETRY_MS = COVER_MIRROR.negativeRetryDays * DAY_MS;
export const REVALIDATE_MS = COVER_MIRROR.revalidateDays * DAY_MS;
