import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/api/errors";

// Búsqueda de géneros por nombre (openspec: show-genres, capability `genre-search`): estilos
// visibles cuyo nombre en español o en inglés contiene el texto sin distinguir mayúsculas ni
// tildes (`search_normalize`, migración 0050). Son ~2.200 filas: un scan alcanza.

export const GENRE_SEARCH_LIMIT = 20;
export const GENRE_SUGGESTIONS_LIMIT = 12;
export const GENRE_SEARCH_MAX_LENGTH = 60;

export interface GenreSearchResult {
  slug: string;
  name: string;
  nameEs: string | null;
}

/** Fila cruda de la consulta (`db.execute` exige un tipo con firma de índice). */
type GenreSearchRow = { slug: string; name: string; nameEs: string | null };

/** Texto válido (recortado, ≤60) o vacío; más de 60 caracteres es un error de validación. */
export function normalizeGenreQuery(raw: string | null | undefined): string {
  const query = (raw ?? "").trim();
  if (query.length > GENRE_SEARCH_MAX_LENGTH) {
    throw new ApiError("VALIDATION_ERROR", 400, "El texto de búsqueda es demasiado largo");
  }
  return query;
}

/** Escapa los comodines de LIKE para buscar el texto literal. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// Usos de un género: álbumes y artistas con él como semilla (no cuentan los ocultos: no salen).
const USAGE = sql`(
  (SELECT count(*) FROM release_group_genre_seed s WHERE s.genre_id = g.id) +
  (SELECT count(*) FROM artist_genre_seed s WHERE s.genre_id = g.id)
)`;

/**
 * Sin texto: los 12 géneros más usados. Con texto: coincidencia exacta, prefijo y resto; dentro
 * de cada grupo, por uso y después por nombre (máximo 20).
 */
export async function searchGenres(rawQuery: string | null | undefined): Promise<GenreSearchResult[]> {
  const query = normalizeGenreQuery(rawQuery);

  if (query.length === 0) {
    const rows = await db.execute<GenreSearchRow>(sql`
      SELECT g.slug, g.name, g.name_es AS "nameEs"
      FROM genre g
      WHERE g.kind = 'style'
      ORDER BY ${USAGE} DESC, g.name ASC
      LIMIT ${GENRE_SUGGESTIONS_LIMIT}
    `);
    return rows.map(({ slug, name, nameEs }) => ({ slug, name, nameEs }));
  }

  const like = escapeLike(query);
  const rows = await db.execute<GenreSearchRow>(sql`
    WITH q AS (SELECT search_normalize(${query}) AS exact, search_normalize(${like}) AS pattern)
    SELECT g.slug, g.name, g.name_es AS "nameEs"
    FROM genre g, q
    WHERE g.kind = 'style' AND (
      search_normalize(g.name) LIKE '%' || q.pattern || '%' ESCAPE '\\'
      OR search_normalize(coalesce(g.name_es, '')) LIKE '%' || q.pattern || '%' ESCAPE '\\'
    )
    ORDER BY
      CASE
        WHEN search_normalize(g.name) = q.exact OR search_normalize(coalesce(g.name_es, '')) = q.exact THEN 0
        WHEN search_normalize(g.name) LIKE q.pattern || '%' ESCAPE '\\'
          OR search_normalize(coalesce(g.name_es, '')) LIKE q.pattern || '%' ESCAPE '\\' THEN 1
        ELSE 2
      END,
      ${USAGE} DESC,
      g.name ASC
    LIMIT ${GENRE_SEARCH_LIMIT}
  `);
  return rows.map(({ slug, name, nameEs }) => ({ slug, name, nameEs }));
}
