import { sql } from "drizzle-orm";
import { db } from "@/db";

// Solicitudes de resincronización desde el calendario de lanzamientos (openspec:
// refresh-discography-on-new-releases): un disco del feed que todavía no está en la discografía
// guardada de su artista pide que la próxima visita la resincronice completa, sin esperar los 7
// días. No hace requests externas: solo cruza tablas propias.

/** Intervalo mínimo entre la última verificación de una discografía y una nueva solicitud. */
export const REFRESH_REQUEST_COOLDOWN_HOURS = 24;

/**
 * Marca a los artistas con discografía guardada que figuran en una entrada no excluida del
 * calendario cuyo release-group no está acreditado a ellos, salvo que su discografía se haya
 * verificado en las últimas 24 h (acota a una resincronización por día un disco que nunca entra al
 * browse, por ejemplo uno solo bootleg). Devuelve cuántos artistas marcó. Nunca lanza: la
 * sincronización del calendario no falla por esto.
 */
export async function requestDiscographyRefreshes({ artistIds }: { artistIds?: string[] } = {}): Promise<number> {
  // `artistIds` acota la marca a esos artistas (smoke test: no tocar los artistas reales de la base).
  if (artistIds?.length === 0) return 0;
  const scope = artistIds
    ? sql`AND a.id IN (${sql.join(
        artistIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})`
    : sql``;
  try {
    const rows = await db.execute<{ id: string }>(sql`
      UPDATE artist a
      SET discography_refresh_requested_at = now()
      WHERE a.discography_synced_at IS NOT NULL
        ${scope}
        AND a.mbid IS NOT NULL
        AND coalesce(greatest(a.discography_checked_at, a.discography_complete_at), '-infinity'::timestamptz)
            < now() - make_interval(hours => ${REFRESH_REQUEST_COOLDOWN_HOURS})
        AND EXISTS (
          SELECT 1 FROM release_calendar_entry e
          WHERE e.artist_mbids @> ARRAY[a.mbid]
            AND e.exclusion IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM release_group rg
              JOIN credit c ON c.release_group_id = rg.id
              WHERE rg.mbid = e.release_group_mbid AND c.artist_id = a.id
            )
        )
      RETURNING a.id
    `);
    return rows.length;
  } catch (error) {
    console.error("[discography] no se pudieron registrar las solicitudes de resincronización", error);
    return 0;
  }
}
