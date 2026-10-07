// Relación de una persona con artistas, para el calendario de lanzamientos de Inicio (openspec:
// add-home-release-calendar). Un artista está "en relación" si la persona lo sigue, lo tiene en
// favoritos, valoró con 4 estrellas o más un disco o canción suya, lo escuchó, o tiene un disco
// suyo en su colección o en "En tu búsqueda". Los discos y canciones se atribuyen a su artista
// principal (`credit.role = 'primary'`).

import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";

/** Peso de cada tipo de relación: ordena la selección personal. */
export const RELATION_WEIGHT = {
  follow: 4,
  favoriteOrHighRating: 3,
  listen: 2,
  collection: 1,
} as const;

/** Estrellas mínimas para que una valoración cuente como relación. */
export const HIGH_RATING_STARS = 4;

/**
 * `(user_id, artist_id, weight, follows)` de todas las relaciones, opcionalmente filtradas por
 * persona. Cuentas desactivadas fuera.
 */
function relationRows(userId: string | null): SQL {
  const byUser = (column: string) => (userId ? sql`AND ${sql.raw(column)} = ${userId}::uuid` : sql``);
  const primaryOf = (alias: string) => sql.raw(`
    LEFT JOIN credit c ON c.role = 'primary'
      AND (c.release_group_id = ${alias}.release_group_id OR c.recording_id = ${alias}.recording_id)`);
  return sql`
    SELECT f.user_id, f.artist_id, ${RELATION_WEIGHT.follow}::int AS weight, true AS follows
      FROM artist_follow f WHERE true ${byUser("f.user_id")}
    UNION ALL
    SELECT fv.user_id, COALESCE(fv.artist_id, c.artist_id), ${RELATION_WEIGHT.favoriteOrHighRating}::int, false
      FROM favorite fv ${primaryOf("fv")} WHERE true ${byUser("fv.user_id")}
    UNION ALL
    SELECT r.user_id, COALESCE(r.artist_id, c.artist_id), ${RELATION_WEIGHT.favoriteOrHighRating}::int, false
      FROM rating r ${primaryOf("r")} WHERE r.stars >= ${HIGH_RATING_STARS} ${byUser("r.user_id")}
    UNION ALL
    SELECT l.user_id, COALESCE(l.artist_id, c.artist_id), ${RELATION_WEIGHT.listen}::int, false
      FROM listen_entry l ${primaryOf("l")} WHERE true ${byUser("l.user_id")}
    UNION ALL
    SELECT ce.user_id, c.artist_id, ${RELATION_WEIGHT.collection}::int, false
      FROM collection_entry ce JOIN credit c ON c.role = 'primary' AND c.release_group_id = ce.release_group_id
      WHERE true ${byUser("ce.user_id")}
    UNION ALL
    SELECT we.user_id, c.artist_id, ${RELATION_WEIGHT.collection}::int, false
      FROM wanted_entry we JOIN credit c ON c.role = 'primary' AND c.release_group_id = we.release_group_id
      WHERE true ${byUser("we.user_id")}
  `;
}

/** MBID de los artistas con los que alguna persona (cuenta activa) tiene relación. */
export async function relatedArtistMbidsOfAnyUser(): Promise<string[]> {
  const rows = await db.execute<{ mbid: string }>(sql`
    SELECT DISTINCT a.mbid::text AS mbid
    FROM (${relationRows(null)}) rel
    JOIN app_user u ON u.id = rel.user_id AND u.deactivated_at IS NULL
    JOIN artist a ON a.id = rel.artist_id
    WHERE a.mbid IS NOT NULL
  `);
  return rows.map((row) => row.mbid);
}

export interface RelatedArtist {
  artistId: string;
  mbid: string;
  /** Peso de la relación más fuerte. */
  weight: number;
  follows: boolean;
}

/** Artistas con los que la persona tiene relación, con el peso de la más fuerte. */
export async function relatedArtistsOfUser(userId: string): Promise<RelatedArtist[]> {
  const rows = await db.execute<{ artist_id: string; mbid: string; weight: number; follows: boolean }>(sql`
    SELECT a.id AS artist_id, a.mbid::text AS mbid, MAX(rel.weight)::int AS weight, bool_or(rel.follows) AS follows
    FROM (${relationRows(userId)}) rel
    JOIN artist a ON a.id = rel.artist_id
    WHERE a.mbid IS NOT NULL
    GROUP BY a.id, a.mbid
  `);
  return rows.map((row) => ({
    artistId: row.artist_id,
    mbid: row.mbid,
    weight: Number(row.weight),
    follows: Boolean(row.follows),
  }));
}
