import { COLLECTION_TEMPLATES, findTemplate } from "@/services/discovery/collections/templates";
import { createCoverResolver } from "@/services/discovery/collections/covers";
import { previewCollection } from "@/services/discovery/collections/generate";
import { syncCollections } from "@/services/discovery/collections/sync";
import { MIN_ALBUMS_FOR_SECTION } from "@/services/discovery/constants";

/**
 * Regenera las colecciones destacadas de `/explore` (openspec: automate-explore-collections y
 * add-day-zero-collections, ADR 0033 y 0035), ignorando la antigüedad de la última corrida. Es lo mismo
 * que dispara `/explore` en segundo plano cada semana; sirve para el primer llenado y como respaldo si
 * el entorno corta las tareas posteriores a la respuesta. Requiere que exista la cuenta curadora
 * (`scripts/seed-discovery.ts` la crea).
 *
 * Uso:
 *   tsx --env-file=.env scripts/sync-explore-collections.ts [--template <clave>]... [--include-paused] [--dry-run]
 *
 * Las plantillas pausadas desde la consola editorial se omiten salvo `--include-paused`.
 *
 * `--dry-run` es la comprobación previa al lanzamiento: planifica cada plantilla y verifica sus carátulas
 * exactamente como la generación, pero NO crea ni modifica listas, filas destacadas ni corridas. Imprime,
 * por plantilla, el período, el título, los candidatos, cuántos tienen carátula y por qué no llega al
 * mínimo. Sí puede resolver carátulas contra Cover Art Archive (queda guardado, es idempotente).
 *
 * Sin `--dry-run` escribe en la BD de DATABASE_URL: crea o refresca listas públicas de `@exploracion` y
 * sus filas en `user_list_featured`. Una plantilla con otra corrida en curso se omite.
 */
async function dryRun(keys: string[]): Promise<number> {
  const templates = keys.length > 0 ? keys.map((key) => findTemplate(key)) : [...COLLECTION_TEMPLATES];
  let notReady = 0;
  for (const [index, template] of templates.entries()) {
    if (!template) {
      console.error(`  ✗ plantilla desconocida: ${keys[index]}`);
      notReady += 1;
      continue;
    }
    const preview = await previewCollection(template, new Date(), createCoverResolver());
    const ready = preview.reason === null;
    if (!ready) notReady += 1;
    console.log(`${ready ? "  ✓" : "  ✗"} ${template.key}${preview.title ? ` — "${preview.title}" (${preview.periodKey})` : ""}`);
    console.log(
      `      ${preview.albumIds.length} álbumes con carátula de ${preview.candidates} candidatos; ` +
        `${preview.coverRequests} peticiones de carátula${preview.coverBudgetExhausted ? " (presupuesto agotado)" : ""}`,
    );
    if (preview.reason) console.log(`      motivo: ${preview.reason}`);
  }
  console.log(`\nLas colecciones del día 0 necesitan al menos ${MIN_ALBUMS_FOR_SECTION} álbumes con carátula cada una.`);
  return notReady;
}

async function main() {
  const keys: string[] = [];
  const args = process.argv.slice(2);
  const includePaused = args.includes("--include-paused");
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--template" && args[index + 1]) keys.push(args[(index += 1)]!);
  }

  const started = Date.now();
  if (args.includes("--dry-run")) {
    const notReady = await dryRun(keys);
    console.log(`Simulación lista en ${((Date.now() - started) / 1000).toFixed(1)} s (no se escribió nada).`);
    if (notReady > 0) console.log(`${notReady} plantilla(s) no llegan al mínimo.`);
    return;
  }

  const results = await syncCollections({ keys: keys.length > 0 ? keys : undefined, force: true, includePaused });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  for (const result of results) {
    if (result.status === "skipped") console.log(`  – ${result.key}: otra corrida en curso, se omite`);
    else if (result.status === "failed") console.error(`  ✗ ${result.key}: ${result.error}`);
    else if (result.generated) console.log(`  ✓ ${result.key}: ${result.items} álbumes`);
    else console.log(`  · ${result.key}: ${result.items} álbumes, menos del mínimo; se conserva lo anterior`);
  }
  console.log(`Listo en ${seconds} s.`);
  if (results.some((result) => result.status === "failed")) process.exitCode = 1;
}

main()
  .then(() => process.exit())
  .catch((error) => {
    console.error("Error en la generación de colecciones:", error);
    process.exit(1);
  });
