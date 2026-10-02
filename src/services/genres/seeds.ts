import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { artistGenreSeed, genre, releaseGroupGenreSeed } from "@/db/schema";

// Géneros semilla desde Wikidata P136 (openspec: add-genre-taxonomy, capability `genre-seeds`,
// ADR 0023). Traduce los QIDs de P136 a géneros de la taxonomía por `genre.wikidata_id` y
// reemplaza las semillas de un artista o un álbum. Las semillas viven en tablas propias,
// separadas de los votos de la comunidad: escribir acá no toca ningún voto.

type Executor = Pick<typeof db, "select" | "insert" | "delete">;

export interface GenreQidRow {
  genreId: string;
  wikidataId: string;
}

/**
 * Ids de género en el orden de los QIDs de Wikidata, sin repetidos. Un QID sin género en la
 * taxonomía se descarta; si dos géneros comparten QID, entran los dos.
 */
export function orderSeedGenres(qids: readonly string[], rows: readonly GenreQidRow[]): string[] {
  const byQid = new Map<string, string[]>();
  for (const row of rows) byQid.set(row.wikidataId, [...(byQid.get(row.wikidataId) ?? []), row.genreId].sort());
  return [...new Set(qids.flatMap((qid) => byQid.get(qid) ?? []))];
}

/** Géneros visibles (no ocultos) que corresponden a los QIDs, en su orden. */
export async function genreIdsForQids(executor: Executor, qids: readonly string[]): Promise<string[]> {
  if (qids.length === 0) return [];
  const rows = await executor
    .select({ genreId: genre.id, wikidataId: genre.wikidataId })
    .from(genre)
    .where(and(inArray(genre.wikidataId, [...qids]), ne(genre.kind, "hidden")));
  return orderSeedGenres(
    qids,
    rows.filter((r): r is GenreQidRow => r.wikidataId !== null),
  );
}

/** Reemplaza las semillas de un artista por los géneros de esos QIDs (vacío = sin semillas). */
export async function replaceArtistGenreSeeds(executor: Executor, artistId: string, qids: readonly string[]): Promise<number> {
  const genreIds = await genreIdsForQids(executor, qids);
  await executor.delete(artistGenreSeed).where(eq(artistGenreSeed.artistId, artistId));
  if (genreIds.length > 0) {
    await executor.insert(artistGenreSeed).values(genreIds.map((genreId, position) => ({ artistId, genreId, position })));
  }
  return genreIds.length;
}

/** Reemplaza las semillas de un álbum por los géneros de esos QIDs (vacío = sin semillas). */
export async function replaceReleaseGroupGenreSeeds(
  executor: Executor,
  releaseGroupId: string,
  qids: readonly string[],
): Promise<number> {
  const genreIds = await genreIdsForQids(executor, qids);
  await executor.delete(releaseGroupGenreSeed).where(eq(releaseGroupGenreSeed.releaseGroupId, releaseGroupId));
  if (genreIds.length > 0) {
    await executor
      .insert(releaseGroupGenreSeed)
      .values(genreIds.map((genreId, position) => ({ releaseGroupId, genreId, position })));
  }
  return genreIds.length;
}
