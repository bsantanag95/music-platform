import { NEGATIVE_RETRY_MS } from "@/lib/config/cover-mirror";

/** Columnas de `release_group` que definen el estado de resolución de carátula. */
export interface CoverResolutionRow {
  coverThumbUrl: string | null;
  coverCheckedAt: Date | null;
  coverBlockedAt: Date | null;
}

/**
 * `coverResolved` para el payload de discografía (openspec: mirror-cover-art,
 * decisión 8): la resolución ya tiene una respuesta usable sin consultar CAA.
 * Es verdadero si hay URL conocida, si la ausencia fue confirmada dentro de la
 * ventana de negativos o si la carátula fue retirada. Un negativo vencido
 * cuenta como no resuelto, para que el cliente lo re-resuelva.
 *
 * Deliberadamente NO equivale a "tiene `cover_checked_at`": un negativo
 * vencido tiene la columna pero no está resuelto.
 *
 * Módulo sin dependencias de base de datos: lo consumen tanto servicios como
 * páginas/route handlers que mockean el resto de los servicios en tests.
 */
export function isCoverResolved(rg: CoverResolutionRow): boolean {
  if (rg.coverThumbUrl) return true;
  if (rg.coverBlockedAt) return true;
  return (
    rg.coverCheckedAt !== null &&
    rg.coverCheckedAt !== undefined &&
    Date.now() - rg.coverCheckedAt.getTime() < NEGATIVE_RETRY_MS
  );
}
