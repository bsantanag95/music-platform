import { AWARDS_DATA_DIR, readAllAwards } from "@/services/awards/curation-files";
import { loadAward } from "@/services/awards/load";

/**
 * Carga los premios de `data/awards/` en la base (openspec: add-music-awards, design D4, ADR 0032). Valida todos
 * los archivos antes de escribir y aborta sin tocar nada si alguno falla. Idempotente: correrlo dos veces seguidas
 * no cambia ninguna fila. Crea como stub los álbumes, grabaciones y artistas resueltos que falten en el catálogo,
 * desde la semilla guardada en el archivo: no consulta MusicBrainz. Lo que no está en los archivos se borra (el
 * JSON es la fuente de verdad).
 *
 * Correr después de `pnpm run db:migrate` y cada vez que cambie `data/awards/`.
 *
 * Uso:
 *   tsx --env-file=.env scripts/load-awards.ts [--dir <ruta>]
 *
 * Requiere DATABASE_URL.
 */

async function main() {
  const args = process.argv.slice(2);
  const index = args.indexOf("--dir");
  const dir = index === -1 ? AWARDS_DATA_DIR : args[index + 1];
  if (!dir) {
    console.error("--dir necesita una ruta");
    process.exit(1);
  }

  const { awards, errors } = readAllAwards(dir);
  if (errors.length > 0) {
    console.error(`No se cargó nada: los archivos tienen errores.\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }

  for (const files of awards) {
    const stats = await loadAward(files);
    console.log(`\n${files.slug}: ${stats.stubsCreated} stubs de catálogo creados`);
    for (const c of stats.ceremonies) {
      console.log(
        `  ${c.file}: ${c.categories} categorías, ${c.nominations} nominaciones ` +
          `(${c.linked} enlazadas, ${c.unresolved} como texto), ${c.rewritten} categorías reescritas`,
      );
    }
    if (stats.ceremoniesRemoved || stats.categoriesRemoved) {
      console.log(`  Borradas por no estar en los archivos: ${stats.ceremoniesRemoved} ceremonias, ${stats.categoriesRemoved} categorías`);
    }
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
