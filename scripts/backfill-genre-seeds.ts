import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { artist } from "@/db/schema";
import { refreshReleaseGroupWikidataIds } from "@/services/catalog/ingest-discography";
import { syncAlbumGenreSeeds, WIKIDATA_BATCH_SIZE } from "@/services/genres/album-seeds";
import { replaceArtistGenreSeeds } from "@/services/genres/seeds";
import { wikimedia } from "@/services/wikimedia/client";
import { genreIdsOf } from "@/services/wikimedia/mappers";

/**
 * Siembra los géneros de los artistas y álbumes existentes desde Wikidata P136 (openspec:
 * add-genre-taxonomy, capability `genre-seeds`, ADR 0023). Es lo mismo que hacen la página de
 * artista y la sincronización de discografía en segundo plano, en lote:
 *
 *   1. Artistas con entidad de Wikidata (`artist.wikidata_id`, declarada por MusicBrainz): sus
 *      entidades en lotes de 50 por request y sus semillas.
 *   2. Artistas con discografía sincronizada: vuelve a recorrer el browse de MusicBrainz para
 *      guardar la entidad de Wikidata de sus álbumes (antes de este cambio no se pedía) y siembra
 *      los álbumes vencidos.
 *
 * Correr después de `scripts/load-genre-taxonomy.ts` (sin taxonomía no hay a qué traducir).
 *
 * Uso:
 *   tsx --env-file=.env scripts/backfill-genre-seeds.ts [--limit N] [--dry-run] [--artist <uuid>] [--skip-browse] [--force]
 *
 * `--dry-run` consulta MusicBrainz y Wikidata e informa lo que sembraría, sin escribir.
 * `--limit N` procesa como máximo N artistas en cada etapa (por antigüedad).
 * `--artist <uuid>` procesa un solo artista.
 * `--skip-browse` omite el recorrido del browse (etapa 2 usa las entidades ya guardadas).
 * `--force` ignora la vigencia de 30 días de los álbumes.
 * Requiere DATABASE_URL, MUSICBRAINZ_USER_AGENT y WIKIMEDIA_USER_AGENT en el entorno.
 */

function parseOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    console.error(`${name} necesita un valor`);
    process.exit(1);
  }
  return value;
}

function parseLimit(args: string[]): number | undefined {
  const raw = parseOption(args, "--limit");
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    console.error("--limit necesita un entero positivo");
    process.exit(1);
  }
  return value;
}

async function seedArtists(onlyArtist: string | undefined, limit: number | undefined, dryRun: boolean) {
  const query = db
    .select({ id: artist.id, name: artist.name, wikidataId: artist.wikidataId })
    .from(artist)
    .where(onlyArtist ? and(eq(artist.id, onlyArtist), isNotNull(artist.wikidataId)) : isNotNull(artist.wikidataId))
    .orderBy(asc(artist.createdAt));
  const rows = (limit ? await query.limit(limit) : await query).filter((r): r is typeof r & { wikidataId: string } => r.wikidataId !== null);

  let seeded = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += WIKIDATA_BATCH_SIZE) {
    const batch = rows.slice(i, i + WIKIDATA_BATCH_SIZE);
    try {
      const { entities = {} } = await wikimedia.getEntities([...new Set(batch.map((a) => a.wikidataId))], ["claims"]);
      for (const a of batch) {
        const entity = entities[a.wikidataId];
        const qids = entity && entity.missing === undefined ? genreIdsOf(entity) : [];
        if (dryRun) {
          if (qids.length > 0) seeded++;
          continue;
        }
        if ((await db.transaction((tx) => replaceArtistGenreSeeds(tx, a.id, qids))) > 0) seeded++;
      }
    } catch (error) {
      failed += batch.length;
      console.warn(`  lote de ${batch.length} artistas falló:`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`Artistas con entidad de Wikidata: ${rows.length} → con géneros: ${seeded}${failed ? `, fallidos: ${failed}` : ""}`);
}

async function seedAlbums(
  onlyArtist: string | undefined,
  limit: number | undefined,
  { dryRun, skipBrowse, force }: { dryRun: boolean; skipBrowse: boolean; force: boolean },
) {
  const query = db
    .select({ id: artist.id, mbid: artist.mbid, name: artist.name })
    .from(artist)
    .where(onlyArtist ? eq(artist.id, onlyArtist) : isNotNull(artist.discographySyncedAt))
    .orderBy(asc(artist.createdAt));
  const rows = limit ? await query.limit(limit) : await query;

  const totals = { albums: 0, withoutEntity: 0, seeded: 0, requests: 0, failedBatches: 0, wikidataChanged: 0 };
  for (const [index, a] of rows.entries()) {
    try {
      if (!skipBrowse && a.mbid) {
        const { changed } = await refreshReleaseGroupWikidataIds(a.mbid, { dryRun });
        totals.wikidataChanged += changed;
      }
      const result = await syncAlbumGenreSeeds(a.id, { dryRun, force });
      for (const key of ["albums", "withoutEntity", "seeded", "requests", "failedBatches"] as const) totals[key] += result[key];
      console.log(`  [${index + 1}/${rows.length}] ${a.name}: ${result.seeded}/${result.albums} álbumes con géneros`);
    } catch (error) {
      console.warn(`  [${index + 1}/${rows.length}] ${a.name}: falló`, error instanceof Error ? error.message : error);
    }
  }
  console.log(
    `Álbumes revisados: ${totals.albums} (entidades nuevas o cambiadas: ${totals.wikidataChanged}, sin entidad: ${totals.withoutEntity}) → ` +
      `con géneros: ${totals.seeded}; requests a Wikidata: ${totals.requests}${totals.failedBatches ? `, lotes fallidos: ${totals.failedBatches}` : ""}`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const skipBrowse = args.includes("--skip-browse");
  const force = args.includes("--force");
  const limit = parseLimit(args);
  const onlyArtist = parseOption(args, "--artist");

  if (dryRun) console.log("(simulación: no se escribe nada)");
  console.log("1. Semillas de artistas");
  await seedArtists(onlyArtist, limit, dryRun);
  console.log("2. Semillas de álbumes");
  await seedAlbums(onlyArtist, limit, { dryRun, skipBrowse, force });
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
