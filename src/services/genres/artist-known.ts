import { sql, type SQL } from "drizzle-orm";

// «Artista conocido» (openspec: add-genre-artist-discovery, capability `genre-artist-discovery`): una
// sola definición, en SQL, para la marca de la tarjeta, el filtro `conocidos=no` y el riel «Para
// descubrir». Un artista es conocido para una persona si existe al menos una señal EXPLÍCITA suya:
//   1. lo sigue;
//   2. valoró al artista o un álbum donde figura acreditado (principal o invitado);
//   3. registró una escucha del artista o de un álbum donde figura acreditado;
//   4. lo tiene en favoritos o pendientes, o tiene en ellos un álbum suyo.
// No se infiere gusto ni afinidad. Las señales de una persona nunca se exponen a otras.

/** Tablas de acciones propias que pueden apuntar a un artista o a un álbum. */
const SIGNAL_TABLES = ["rating", "listen_entry", "favorite", "want_to_listen_entry"] as const;

/**
 * Condición «el lector conoce al artista `artistRef`». `artistRef` es la expresión SQL del identificador
 * del artista en la consulta exterior (por defecto `a.id`). Sin lector devuelve `null`: nadie conoce a
 * nadie y la interfaz no muestra marcas.
 */
export function artistKnownCondition(readerId: string | null, artistRef: SQL = sql`a.id`): SQL | null {
  if (!readerId) return null;
  const signals: SQL[] = [
    sql`EXISTS (SELECT 1 FROM artist_follow f WHERE f.user_id = ${readerId}::uuid AND f.artist_id = ${artistRef})`,
  ];
  for (const table of SIGNAL_TABLES) {
    const t = sql.raw(table);
    signals.push(
      sql`EXISTS (SELECT 1 FROM ${t} s WHERE s.user_id = ${readerId}::uuid AND s.artist_id = ${artistRef})`,
      sql`EXISTS (
        SELECT 1 FROM ${t} s JOIN credit kc ON kc.release_group_id = s.release_group_id
        WHERE s.user_id = ${readerId}::uuid AND kc.artist_id = ${artistRef}
      )`,
    );
  }
  return sql`(${sql.join(signals, sql` OR `)})`;
}

/** Condición «el lector sigue al artista `artistRef`». `null` sin lector. */
export function artistFollowingCondition(readerId: string | null, artistRef: SQL = sql`a.id`): SQL | null {
  if (!readerId) return null;
  return sql`EXISTS (SELECT 1 FROM artist_follow f WHERE f.user_id = ${readerId}::uuid AND f.artist_id = ${artistRef})`;
}
