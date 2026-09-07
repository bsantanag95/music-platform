import { asc } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup } from "@/db/schema";
import { recanonicalizeReleaseGroup } from "@/services/catalog/recanonicalize";

/**
 * Reevalúa la edición representativa de release-groups ya ingeridos y
 * repuebla su fecha de lanzamiento canónica (openspec:
 * canonicalize-release-group). Corregir una edición subóptima reemplaza
 * `release` + `track` SIN tocar ningún dato social (todo cuelga del
 * release-group). Complementa `scripts/backfill-release-credits.ts`, que
 * solo sincroniza créditos de la edición ya elegida.
 *
 * Uso:
 *   tsx --env-file=.env scripts/recanonicalize-release-group.ts <id> [<id> ...]
 *   tsx --env-file=.env scripts/recanonicalize-release-group.ts --all
 *   tsx --env-file=.env scripts/recanonicalize-release-group.ts --all --dry-run
 *
 * `--dry-run` informa qué edición elegiría sin escribir nada.
 * `--all` recorre todos los release-groups con `mbid`, con una pausa entre
 * cada uno para respetar el rate limit de MusicBrainz.
 *
 * Requiere DATABASE_URL en el entorno.
 */

const RATE_LIMIT_PAUSE_MS = 1100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolveTargetIds(args: string[]): Promise<string[]> {
  if (args.includes("--all")) {
    const rows = await db
      .select({ id: releaseGroup.id })
      .from(releaseGroup)
      .orderBy(asc(releaseGroup.createdAt));
    return rows.map((r) => r.id);
  }
  return args.filter((a) => !a.startsWith("--"));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const ids = await resolveTargetIds(args);

  if (ids.length === 0) {
    console.error(
      "Nada que hacer. Pasá uno o más ids de release-group, o `--all`.\n" +
        "Ej: tsx --env-file=.env scripts/recanonicalize-release-group.ts --all --dry-run",
    );
    process.exit(1);
  }

  console.log(
    `${dryRun ? "[DRY-RUN] " : ""}Reevaluando ${ids.length} release-group(s)...\n`,
  );

  const tally: Record<string, number> = {};

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    try {
      const result = await recanonicalizeReleaseGroup(id, { dryRun });
      tally[result.status] = (tally[result.status] ?? 0) + 1;

      const detail =
        result.status === "dry-run"
          ? `${result.wouldChangeEdition ? "CAMBIARÍA" : "sin cambio"} · edición ${result.currentReleaseMbid ?? "—"} → ${result.chosenReleaseMbid ?? "—"} · fecha canónica ${result.canonicalFirstReleaseDate ?? "—"}`
          : result.status === "recanonicalized"
            ? `${result.fromReleaseMbid ?? "—"} → ${result.toReleaseMbid}`
            : result.status === "skipped"
              ? result.reason
              : "";
      console.log(`[${i + 1}/${ids.length}] ${id} · ${result.status}${detail ? ` · ${detail}` : ""}`);
    } catch (error) {
      tally.error = (tally.error ?? 0) + 1;
      console.error(`[${i + 1}/${ids.length}] ${id} · ERROR:`, error instanceof Error ? error.message : error);
    }

    if (i < ids.length - 1) await sleep(RATE_LIMIT_PAUSE_MS);
  }

  console.log(
    `\nResumen: ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(" · ")}`,
  );
}

main()
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
