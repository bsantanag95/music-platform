import { syncCollections } from "@/services/discovery/collections/sync";

/**
 * Regenera las colecciones destacadas de `/explore` (openspec: automate-explore-collections, ADR 0033),
 * ignorando la antigüedad de la última corrida. Es lo mismo que dispara `/explore` en segundo plano
 * cada semana; sirve para el primer llenado y como respaldo si el entorno corta las tareas posteriores
 * a la respuesta. Requiere que exista la cuenta curadora (`scripts/seed-discovery.ts` la crea).
 *
 * Uso:
 *   tsx --env-file=.env scripts/sync-explore-collections.ts [--template <clave>]... [--include-paused]
 *
 * Las plantillas pausadas desde la consola editorial se omiten salvo `--include-paused`.
 *
 * Escribe en la BD de DATABASE_URL: crea o refresca listas públicas de `@exploracion` y sus filas en
 * `user_list_featured`. Una plantilla con otra corrida en curso se omite.
 */
async function main() {
  const keys: string[] = [];
  const args = process.argv.slice(2);
  const includePaused = args.includes("--include-paused");
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--template" && args[index + 1]) keys.push(args[(index += 1)]!);
  }

  const started = Date.now();
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
