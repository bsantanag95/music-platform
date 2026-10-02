import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { credit, releaseGroup, releaseGroupGenreSeed } from "@/db/schema";
import { wikimedia } from "../wikimedia/client";
import { genreIdsOf } from "../wikimedia/mappers";
import { replaceReleaseGroupGenreSeeds } from "./seeds";

// Semillas de género de los álbumes de un artista desde Wikidata P136 (openspec:
// add-genre-taxonomy, capability `genre-seeds`, design D7). La entidad de cada álbum es la que
// MusicBrainz declara en el browse de discografía (`release_group.wikidata_id`); nunca se busca
// por nombre. Corre en segundo plano, en lotes, y un fallo de lote conserva las semillas.

/** Vigencia de las semillas de un álbum. */
export const ALBUM_GENRE_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;
/** Entidades por request a `wbgetentities` (máximo de la API para usuarios anónimos). */
export const WIKIDATA_BATCH_SIZE = 50;

export interface AlbumGenreSyncOptions {
  /** Ignora la vigencia de 30 días. */
  force?: boolean;
  /** Consulta Wikidata y cuenta, sin escribir. */
  dryRun?: boolean;
}

export interface AlbumGenreSyncResult {
  /** Álbumes vencidos del artista que se revisaron. */
  albums: number;
  /** Álbumes sin entidad de Wikidata (quedan sin semillas propias). */
  withoutEntity: number;
  /** Álbumes con al menos un género semilla. */
  seeded: number;
  requests: number;
  failedBatches: number;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Álbumes acreditados al artista con semillas nunca sincronizadas o vencidas. */
function staleAlbums(tx: Tx, artistId: string, force: boolean, now: Date) {
  const cutoff = new Date(now.getTime() - ALBUM_GENRE_REFRESH_MS);
  return tx
    .selectDistinct({ id: releaseGroup.id, wikidataId: releaseGroup.wikidataId })
    .from(credit)
    .innerJoin(releaseGroup, eq(releaseGroup.id, credit.releaseGroupId))
    .where(
      and(
        eq(credit.artistId, artistId),
        force ? undefined : or(isNull(releaseGroup.genresSyncedAt), lt(releaseGroup.genresSyncedAt, cutoff)),
      ),
    );
}

const batches = <T>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / WIKIDATA_BATCH_SIZE) }, (_, i) =>
    items.slice(i * WIKIDATA_BATCH_SIZE, (i + 1) * WIKIDATA_BATCH_SIZE),
  );

/**
 * Sincroniza las semillas de los álbumes vencidos de un artista bajo un candado por artista:
 * los que no tienen entidad quedan sincronizados sin semillas; los demás se piden a Wikidata
 * en lotes de 50. Un lote que falla no marca sus álbumes, que quedan para la próxima vez.
 */
export async function syncAlbumGenreSeeds(
  artistId: string,
  { force = false, dryRun = false }: AlbumGenreSyncOptions = {},
): Promise<AlbumGenreSyncResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`album-genres:${artistId}`}, 0))`);
    const now = new Date();
    const albums = await staleAlbums(tx, artistId, force, now);
    const result: AlbumGenreSyncResult = { albums: albums.length, withoutEntity: 0, seeded: 0, requests: 0, failedBatches: 0 };

    const withoutEntity = albums.filter((a) => !a.wikidataId).map((a) => a.id);
    result.withoutEntity = withoutEntity.length;
    if (!dryRun && withoutEntity.length > 0) {
      await tx.delete(releaseGroupGenreSeed).where(inArray(releaseGroupGenreSeed.releaseGroupId, withoutEntity));
      await tx.update(releaseGroup).set({ genresSyncedAt: now }).where(inArray(releaseGroup.id, withoutEntity));
    }

    const linked = albums.filter((a): a is { id: string; wikidataId: string } => a.wikidataId !== null);
    for (const batch of batches(linked)) {
      try {
        result.requests++;
        const qids = [...new Set(batch.map((a) => a.wikidataId))];
        const { entities = {} } = await wikimedia.getEntities(qids, ["claims"]);
        // Una entidad borrada en Wikidata (`missing`) cuenta como sin géneros.
        const genresByQid = new Map(qids.map((qid) => [qid, entities[qid]?.missing === undefined ? genreIdsOf(entities[qid]) : []]));
        if (dryRun) {
          result.seeded += batch.filter((a) => (genresByQid.get(a.wikidataId) ?? []).length > 0).length;
          continue;
        }
        await tx.transaction(async (savepoint) => {
          for (const album of batch) {
            const count = await replaceReleaseGroupGenreSeeds(savepoint, album.id, genresByQid.get(album.wikidataId) ?? []);
            if (count > 0) result.seeded++;
          }
          await savepoint
            .update(releaseGroup)
            .set({ genresSyncedAt: now })
            .where(inArray(releaseGroup.id, batch.map((a) => a.id)));
        });
      } catch (error) {
        result.failedBatches++;
        console.warn(`[genres] lote de ${batch.length} álbumes de ${artistId} falló`, error instanceof Error ? error.message : error);
      }
    }
    return result;
  });
}

/** ¿El artista tiene algún álbum con semillas nunca sincronizadas o vencidas? */
export async function hasStaleAlbumGenres(artistId: string, now = new Date()): Promise<boolean> {
  const cutoff = new Date(now.getTime() - ALBUM_GENRE_REFRESH_MS);
  const [row] = await db
    .select({ id: releaseGroup.id })
    .from(credit)
    .innerJoin(releaseGroup, eq(releaseGroup.id, credit.releaseGroupId))
    .where(
      and(eq(credit.artistId, artistId), or(isNull(releaseGroup.genresSyncedAt), lt(releaseGroup.genresSyncedAt, cutoff))),
    )
    .limit(1);
  return row !== undefined;
}
