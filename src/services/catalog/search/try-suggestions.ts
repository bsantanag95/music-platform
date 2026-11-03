import { sql } from "drizzle-orm";
import { db } from "@/db";
import { isCoverResolved } from "@/services/catalog/cover-resolution";

// "Prueba con" de la portada de /search sin consulta (openspec: refine-search-results-phase2, design D3): los artistas
// y discos con más personas distintas que los siguieron, valoraron o escucharon en público en los últimos 7 días; si la
// semana no alcanza, los últimos 30. Solo ordena: las cifras nunca se muestran. Las escuchas privadas no cuentan y
// tampoco la actividad de cuentas desactivadas. Sin al menos dos sugerencias, la sección no se muestra.

export interface TryArtist {
  id: string;
  name: string;
  photoUrl: string | null;
}

export interface TryAlbum {
  id: string;
  title: string;
  artistName: string | null;
  /** Año del disco: distingue homónimos del mismo artista ("Ratt" EP y "Ratt" álbum). */
  year: number | null;
  coverThumbUrl: string | null;
  coverResolved: boolean;
}

export interface TrySuggestions {
  artists: TryArtist[];
  albums: TryAlbum[];
}

const PER_KIND = 4;
const MIN_TOTAL = 2;

async function read(days: number): Promise<TrySuggestions> {
  const since = sql`now() - make_interval(days => ${days})`;
  const [artists, albums] = await Promise.all([
    db.execute(sql`
      WITH signals AS (
        SELECT f.artist_id, f.user_id FROM artist_follow f WHERE f.created_at > ${since}
        UNION
        SELECT c.artist_id, r.user_id FROM rating r
          JOIN credit c ON c.release_group_id = r.release_group_id AND c.role = 'primary'
          WHERE r.created_at > ${since}
      )
      SELECT a.id, a.name, CASE WHEN a.photo_blocked_at IS NULL THEN a.photo_url END AS photo_url
      FROM signals s
      JOIN artist a ON a.id = s.artist_id
      JOIN app_user u ON u.id = s.user_id AND u.deactivated_at IS NULL
      GROUP BY a.id
      ORDER BY count(DISTINCT s.user_id) DESC, a.name
      LIMIT ${PER_KIND}`),
    db.execute(sql`
      WITH signals AS (
        SELECT r.release_group_id, r.user_id FROM rating r
          WHERE r.release_group_id IS NOT NULL AND r.created_at > ${since}
        UNION
        SELECT l.release_group_id, l.user_id FROM listen_entry l
          WHERE l.release_group_id IS NOT NULL AND l.audience <> 'private' AND l.created_at > ${since}
      )
      SELECT rg.id, rg.title, rg.first_release_year, rg.cover_thumb_url, rg.cover_checked_at, rg.cover_blocked_at,
        (SELECT string_agg(a.name, ', ' ORDER BY c.position) FROM credit c JOIN artist a ON a.id = c.artist_id
          WHERE c.release_group_id = rg.id AND c.role = 'primary') AS artist_name
      FROM signals s
      JOIN release_group rg ON rg.id = s.release_group_id
      JOIN app_user u ON u.id = s.user_id AND u.deactivated_at IS NULL
      GROUP BY rg.id
      ORDER BY count(DISTINCT s.user_id) DESC, rg.title
      LIMIT ${PER_KIND}`),
  ]);
  return {
    artists: (artists as unknown as { id: string; name: string; photo_url: string | null }[]).map((row) => ({
      id: row.id,
      name: row.name,
      photoUrl: row.photo_url,
    })),
    albums: (
      albums as unknown as {
        id: string;
        title: string;
        artist_name: string | null;
        first_release_year: number | null;
        cover_thumb_url: string | null;
        cover_checked_at: string | null;
        cover_blocked_at: string | null;
      }[]
    ).map((row) => ({
      id: row.id,
      title: row.title,
      artistName: row.artist_name,
      year: row.first_release_year,
      coverThumbUrl: row.cover_blocked_at ? null : row.cover_thumb_url,
      coverResolved: isCoverResolved({
        coverThumbUrl: row.cover_thumb_url,
        // `db.execute` devuelve los timestamps como texto.
        coverCheckedAt: row.cover_checked_at ? new Date(row.cover_checked_at) : null,
        coverBlockedAt: row.cover_blocked_at ? new Date(row.cover_blocked_at) : null,
      } as Parameters<typeof isCoverResolved>[0]),
    })),
  };
}

/** Sugerencias de la semana o, si no alcanza, del mes; `null` con menos de dos. */
export async function listTrySuggestions(): Promise<TrySuggestions | null> {
  for (const days of [7, 30]) {
    const found = await read(days);
    if (found.artists.length + found.albums.length >= MIN_TOTAL) return found;
  }
  return null;
}
