import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { normalizeSearchText } from "./normalize";

// "¿Quisiste decir…?" de una búsqueda sin coincidencias (openspec: refine-search-results-phase1, design D2). Sale del
// catálogo propio con los índices de trigramas de la migración 0050 (`search_normalize(...) gin_trgm_ops`): ninguna
// consulta más a MusicBrainz. Primero el campo del tipo (título del disco o de la canción, nombre del artista) y, en
// discos y canciones, después el nombre del artista ("pink floid" en Álbumes sugiere "Pink Floyd"). Ante dos parecidos,
// gana el de un artista ya explorado en la plataforma.

export type SpellingType = "artist" | "album" | "song";

/** Parecido mínimo (similitud de trigramas) para sugerir: por debajo, la sugerencia confunde más de lo que ayuda. */
export const SPELLING_MIN_SIMILARITY = 0.45;

function candidateQuery(source: "artist" | "album" | "song", text: string): SQL {
  if (source === "artist") {
    return sql`
      SELECT a.name AS value, similarity(search_normalize(a.name), search_normalize(${text})) AS score,
             (a.discography_synced_at IS NOT NULL) AS explored
      FROM artist a
      WHERE search_normalize(a.name) % search_normalize(${text})
      ORDER BY score DESC, explored DESC, a.name
      LIMIT 5`;
  }
  const table = source === "album" ? sql`release_group` : sql`recording`;
  const creditColumn = source === "album" ? sql`c.release_group_id` : sql`c.recording_id`;
  return sql`
    SELECT t.title AS value, similarity(search_normalize(t.title), search_normalize(${text})) AS score,
           EXISTS (
             SELECT 1 FROM credit c JOIN artist a ON a.id = c.artist_id
             WHERE ${creditColumn} = t.id AND c.role = 'primary' AND a.discography_synced_at IS NOT NULL
           ) AS explored
    FROM ${table} t
    WHERE search_normalize(t.title) % search_normalize(${text})
    ORDER BY score DESC, explored DESC, t.title
    LIMIT 5`;
}

/** La sugerencia más parecida que no sea la consulta misma, o `null`. */
export async function suggestSpelling(type: SpellingType, query: string): Promise<string | null> {
  const text = query.trim();
  if (text.length < 3) return null;
  const own = normalizeSearchText(text);
  const sources: ("artist" | "album" | "song")[] = type === "artist" ? ["artist"] : [type, "artist"];
  let best: { value: string; score: number; explored: boolean } | null = null;
  for (const source of sources) {
    const rows = (await db.execute(candidateQuery(source, text))) as unknown as {
      value: string;
      score: number;
      explored: boolean;
    }[];
    for (const row of rows) {
      const score = Number(row.score);
      if (score < SPELLING_MIN_SIMILARITY || normalizeSearchText(row.value) === own) continue;
      if (!best || score > best.score || (score === best.score && row.explored && !best.explored)) {
        best = { value: row.value, score, explored: row.explored };
      }
    }
  }
  return best?.value ?? null;
}
