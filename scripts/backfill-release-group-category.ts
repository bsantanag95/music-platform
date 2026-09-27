import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { artist, releaseGroup } from "@/db/schema";
import { musicbrainz } from "@/services/musicbrainz/client";
import {
  planCategoryUpdates,
  type CategoryUpdate,
  type FetchedTypes,
  type StoredCategory,
} from "@/services/catalog/release-group-category";

/**
 * Reclasifica los release-groups ya ingeridos con la regla de categoría vigente (openspec:
 * redesign-song-page, D13): un `Album` con tipos secundarios (Demo, Remix, Soundtrack…) deja
 * de ser `studio`. No guardamos los tipos secundarios, así que se vuelven a pedir:
 *
 * 1. Una request por página de discografía de cada artista sincronizado
 *    (`browseReleaseGroupsByArtist` trae los tipos de todos sus discos).
 * 2. Para los discos `studio` que el paso 1 no cubrió (stubs de apariciones), una request por
 *    disco (`browseReleasesByReleaseGroup` trae el release-group embebido con sus tipos). El
 *    error solo podía clasificar de más como `studio`, así que no hace falta revisar el resto.
 *
 * Solo escribe `category` en las filas que cambian.
 *
 * Uso:
 *   tsx --env-file=.env scripts/backfill-release-group-category.ts [--dry-run] [--limit N]
 *
 * `--dry-run` pide los tipos y reporta los cambios, sin escribir.
 * `--limit N` procesa como máximo N artistas en el paso 1 y N discos en el paso 2.
 * El cliente de MusicBrainz ya respeta el rate limit (≥1,1 s entre requests).
 *
 * Requiere DATABASE_URL en el entorno.
 */

const PAGE_SIZE = 100;

function parseLimit(args: string[]): number | undefined {
  const index = args.indexOf("--limit");
  if (index === -1) return undefined;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 1) {
    console.error("--limit necesita un entero positivo");
    process.exit(1);
  }
  return value;
}

async function fetchArtistTypes(artistMbid: string): Promise<FetchedTypes[]> {
  const fetched: FetchedTypes[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await musicbrainz.browseReleaseGroupsByArtist(artistMbid, offset);
    for (const rg of page["release-groups"]) {
      fetched.push({ mbid: rg.id, primaryType: rg["primary-type"], secondaryTypes: rg["secondary-types"] });
    }
    const total = page["release-group-count"] ?? 0;
    if (page["release-groups"].length < PAGE_SIZE || offset + PAGE_SIZE >= total) break;
  }
  return fetched;
}

async function fetchReleaseGroupTypes(mbid: string): Promise<FetchedTypes | null> {
  const page = await musicbrainz.browseReleasesByReleaseGroup(mbid);
  const embedded = page.releases.find((item) => item["release-group"])?.["release-group"];
  return embedded ? { mbid, primaryType: embedded["primary-type"], secondaryTypes: embedded["secondary-types"] } : null;
}

async function loadStored(mbids: string[]): Promise<StoredCategory[]> {
  if (mbids.length === 0) return [];
  const rows = await db
    .select({ id: releaseGroup.id, mbid: releaseGroup.mbid, title: releaseGroup.title, category: releaseGroup.category })
    .from(releaseGroup)
    .where(inArray(releaseGroup.mbid, mbids));
  return rows.flatMap((row) => (row.mbid ? [{ ...row, mbid: row.mbid }] : []));
}

async function apply(updates: CategoryUpdate[], dryRun: boolean): Promise<void> {
  for (const update of updates) {
    console.log(`  ${update.title} (${update.mbid}): ${update.from} → ${update.to}`);
    if (!dryRun) await db.update(releaseGroup).set({ category: update.to }).where(eq(releaseGroup.id, update.id));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limit = parseLimit(args);
  const prefix = dryRun ? "[DRY-RUN] " : "";

  // Paso 1: discografías de los artistas sincronizados.
  const artistsQuery = db
    .select({ name: artist.name, mbid: artist.mbid })
    .from(artist)
    .where(and(isNotNull(artist.discographySyncedAt), isNotNull(artist.mbid)))
    .orderBy(asc(artist.name));
  const artists = limit ? await artistsQuery.limit(limit) : await artistsQuery;
  console.log(`${prefix}Paso 1: ${artists.length} artista(s) con discografía sincronizada\n`);

  const covered = new Set<string>();
  let changed = 0;
  for (const { name, mbid } of artists) {
    if (!mbid) continue;
    try {
      const fetched = await fetchArtistTypes(mbid);
      for (const item of fetched) covered.add(item.mbid);
      const updates = planCategoryUpdates(await loadStored(fetched.map((item) => item.mbid)), fetched);
      if (updates.length > 0) console.log(`${name}: ${updates.length} cambio(s)`);
      await apply(updates, dryRun);
      changed += updates.length;
    } catch (error) {
      console.error(`${name}: no se pudo reclasificar`, error);
    }
  }

  // Paso 2: discos `studio` no cubiertos por ninguna discografía.
  const studio = await db
    .select({ id: releaseGroup.id, mbid: releaseGroup.mbid, title: releaseGroup.title, category: releaseGroup.category })
    .from(releaseGroup)
    .where(and(eq(releaseGroup.category, "studio"), isNotNull(releaseGroup.mbid)))
    .orderBy(asc(releaseGroup.title));
  const pending = studio.filter((row) => row.mbid && !covered.has(row.mbid)).slice(0, limit);
  console.log(`\n${prefix}Paso 2: ${pending.length} disco(s) de estudio fuera de las discografías\n`);

  for (const row of pending) {
    if (!row.mbid) continue;
    try {
      const fetched = await fetchReleaseGroupTypes(row.mbid);
      if (!fetched) continue;
      const updates = planCategoryUpdates([{ ...row, mbid: row.mbid }], [fetched]);
      await apply(updates, dryRun);
      changed += updates.length;
    } catch (error) {
      console.error(`${row.title}: no se pudo reclasificar`, error);
    }
  }

  console.log(`\n${prefix}${changed} disco(s) ${dryRun ? "cambiarían" : "reclasificados"} de categoría.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
