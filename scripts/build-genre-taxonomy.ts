import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { curation } from "../data/genres/curation";
import { GENRE_FAMILIES } from "@/services/genres/families";
import {
  DUMP_TABLES,
  buildTaxonomy,
  serializeTaxonomy,
  type DumpTable,
  type TaxonomyFile,
  type WikidataGenreLabel,
} from "@/services/genres/taxonomy-build";
import { wikimedia } from "@/services/wikimedia/client";

/**
 * Genera `data/genres/taxonomy.json` (openspec: add-genre-taxonomy, design D2, ADR 0023): los
 * géneros de MusicBrainz con su jerarquía (dump core, CC0), sus nombres en español (Wikidata,
 * P8052) y las familias calculadas con `data/genres/curation.ts`. No toca la base de datos: el
 * archivo se revisa en el diff, se commitea y se carga con `scripts/load-genre-taxonomy.ts`.
 *
 * Preparación (solo al actualizar la taxonomía; el dump pesa ~7 GB y tar extrae 4 tablas):
 *   1. Bajar mbdump.tar.bz2 de https://data.metabrainz.org/pub/musicbrainz/data/fullexport/<LATEST>/
 *   2. tar -xjf mbdump.tar.bz2 TIMESTAMP mbdump/genre mbdump/l_genre_genre mbdump/link mbdump/link_type
 *
 * Uso:
 *   tsx --env-file=.env scripts/build-genre-taxonomy.ts --dump <carpeta extraída> [--dry-run]
 *
 * `--dry-run` imprime el reporte sin escribir el archivo. Falla (sin escribir) si la curaduría
 * nombra un género que ya no existe, si una familia principal queda vacía o si cambió la forma
 * del dump. Requiere WIKIMEDIA_USER_AGENT (no requiere DATABASE_URL).
 */

const OUTPUT = fileURLToPath(new URL("../data/genres/taxonomy.json", import.meta.url));

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

function readTables(dumpDir: string): Record<DumpTable, string[]> {
  const base = existsSync(path.join(dumpDir, "mbdump")) ? path.join(dumpDir, "mbdump") : dumpDir;
  const tables = {} as Record<DumpTable, string[]>;
  for (const table of DUMP_TABLES) {
    const file = path.join(base, table);
    if (!existsSync(file)) {
      console.error(`Falta ${file}. Extraer del dump: tar -xjf mbdump.tar.bz2 mbdump/${table}`);
      process.exit(1);
    }
    tables[table] = readFileSync(file, "utf8").split("\n");
  }
  return tables;
}

function readDumpTimestamp(dumpDir: string): string | null {
  const file = path.join(dumpDir, "TIMESTAMP");
  return existsSync(file) ? readFileSync(file, "utf8").trim() || null : null;
}

const qidNumber = (qid: string) => Number(qid.slice(1));

/** Ítems de Wikidata con P8052 (ID de género de MusicBrainz) y su etiqueta en español. */
async function fetchLabels(): Promise<{ labels: Map<string, WikidataGenreLabel>; conflicts: number }> {
  const response = await wikimedia.sparql(
    `SELECT ?item ?mbid ?es WHERE {
       ?item wdt:P8052 ?mbid .
       OPTIONAL { ?item rdfs:label ?es FILTER(lang(?es) = "es") }
     }`,
  );
  const labels = new Map<string, WikidataGenreLabel>();
  const itemsPerMbid = new Map<string, Set<string>>();
  for (const row of response.results?.bindings ?? []) {
    const qid = row.item?.value.split("/").pop();
    const mbid = row.mbid?.value.toLowerCase();
    if (!qid || !/^Q\d+$/.test(qid) || !mbid) continue;
    itemsPerMbid.set(mbid, (itemsPerMbid.get(mbid) ?? new Set()).add(qid));
    const current = labels.get(mbid);
    // Varios ítems para el mismo género: gana el de menor número (determinista).
    if (!current || qidNumber(qid) < qidNumber(current.qid)) {
      labels.set(mbid, { qid, es: row.es?.value ?? null });
    } else if (current.qid === qid && !current.es && row.es) {
      current.es = row.es.value;
    }
  }
  const conflicts = [...itemsPerMbid.values()].filter((items) => items.size > 1).length;
  return { labels, conflicts };
}

async function main() {
  const args = process.argv.slice(2);
  const dumpDir = parseOption(args, "--dump");
  const dryRun = args.includes("--dry-run");
  if (!dumpDir) {
    console.error("Uso: tsx --env-file=.env scripts/build-genre-taxonomy.ts --dump <carpeta> [--dry-run]");
    process.exit(1);
  }

  const tables = readTables(dumpDir);
  const { labels, conflicts } = await fetchLabels();
  const previous: TaxonomyFile | null = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, "utf8")) : null;

  const { file, errors, unmappedRoots, ruleCounts } = buildTaxonomy({
    tables,
    labels,
    curation,
    previous,
    mbDump: readDumpTimestamp(dumpDir),
  });

  const genres = file.genres;
  const byKind = (kind: string) => genres.filter((g) => g.kind === kind).length;
  console.log(`Géneros: ${genres.length} (${byKind("style")} estilos, ${byKind("descriptor")} descriptores, ${byKind("hidden")} ocultos)`);
  console.log(
    `Relaciones: ${genres.reduce((n, g) => n + g.subgenreOf.length, 0)} subgénero de, ` +
      `${genres.reduce((n, g) => n + g.fusionOf.length, 0)} fusión de, ` +
      `${genres.reduce((n, g) => n + g.influencedBy.length, 0)} influido por`,
  );
  console.log(
    `Wikidata: ${genres.filter((g) => g.wikidataId).length} con entidad, ${genres.filter((g) => g.nameEs).length} con nombre en español distinto; ${conflicts} géneros con más de un ítem`,
  );
  console.log("Reglas:", JSON.stringify(ruleCounts));
  console.log("Por familia:");
  for (const family of GENRE_FAMILIES) {
    const n = genres.filter((g) => g.families.includes(family.key)).length;
    console.log(`  ${family.key.padEnd(13)} ${String(n).padStart(4)}`);
  }
  if (unmappedRoots.length > 0) console.log(`Raíces sin mapear (caen en world): ${unmappedRoots.join(", ")}`);
  if (previous) {
    const before = new Map(previous.genres.map((g) => [g.mbid, JSON.stringify(g)]));
    const changed = genres.filter((g) => before.get(g.mbid) !== JSON.stringify(g)).length;
    const retired = previous.genres.filter((g) => !genres.some((n) => n.mbid === g.mbid)).length;
    console.log(`Respecto del archivo anterior: ${changed} géneros nuevos o cambiados, ${retired} retirados (quedarán ocultos al cargar)`);
  }

  if (errors.length > 0) {
    console.error(`\n⛔ ${errors.length} error(es); no se escribe el archivo:`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
  }
  if (dryRun) {
    console.log("\n(dry-run: no se escribió el archivo)");
    return;
  }
  writeFileSync(OUTPUT, serializeTaxonomy(file));
  console.log(`\nEscrito ${path.relative(process.cwd(), OUTPUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
