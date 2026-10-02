import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadTaxonomy } from "@/services/genres/taxonomy-load";
import type { TaxonomyFile } from "@/services/genres/taxonomy-build";

/**
 * Carga `data/genres/taxonomy.json` en la base (openspec: add-genre-taxonomy, design D2): upsert
 * de géneros por MBID, relaciones y pertenencias a familias por diferencia, y los géneros que ya
 * no vienen en el archivo quedan ocultos. Idempotente: correrlo dos veces seguidas no cambia nada.
 * Correr después de `pnpm run db:migrate` y cada vez que se regenera la taxonomía.
 *
 * Uso:
 *   tsx --env-file=.env scripts/load-genre-taxonomy.ts [--file <ruta>]
 *
 * Requiere DATABASE_URL.
 */

const DEFAULT_FILE = fileURLToPath(new URL("../data/genres/taxonomy.json", import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf("--file");
  const path = index === -1 ? DEFAULT_FILE : args[index + 1];
  if (!path) {
    console.error("--file necesita una ruta");
    process.exit(1);
  }
  const file = JSON.parse(readFileSync(path, "utf8")) as TaxonomyFile;
  console.log(`Cargando ${file.genres.length} géneros (dump de MusicBrainz: ${file.mbDump ?? "desconocido"})…`);
  const stats = await loadTaxonomy(file);
  console.log(
    `Géneros: ${stats.inserted} nuevos, ${stats.updated} actualizados, ${stats.hidden} ocultados por retiro\n` +
      `Relaciones: +${stats.relationsAdded} −${stats.relationsRemoved}\n` +
      `Pertenencias a familias: +${stats.membersAdded} −${stats.membersRemoved}`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
