import { and, asc, eq, exists, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { release, releaseGroup } from "@/db/schema";
import { syncReleaseEditions } from "@/services/catalog/release-editions";

/**
 * Sincroniza el resumen de ediciones (sellos, formatos, recuento de pistas) de los
 * álbumes ingeridos antes de que existiera (openspec: enrich-album-editions-and-credits).
 * Es lo mismo que hace la página de álbum en segundo plano, en lote. NUNCA cambia la
 * edición representativa: con `--report-representative` lista los álbumes cuya
 * representativa cambiaría con todas las ediciones, para corregirlos a mano con
 * `scripts/recanonicalize-release-group.ts`.
 *
 * Uso:
 *   tsx --env-file=.env scripts/backfill-release-editions.ts [--limit N] [--dry-run] [--report-representative]
 *
 * `--dry-run` pide las ediciones y reporta, sin escribir.
 * `--limit N` procesa como máximo N álbumes pendientes (por antigüedad).
 * El cliente de MusicBrainz ya respeta el rate limit (≥1,1 s entre requests).
 *
 * Requiere DATABASE_URL en el entorno.
 */

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

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const reportRepresentative = args.includes("--report-representative");
  const limit = parseLimit(args);

  const pendingQuery = db
    .select({ id: releaseGroup.id, title: releaseGroup.title })
    .from(releaseGroup)
    .where(
      and(
        isNull(releaseGroup.editionsSyncedAt),
        isNotNull(releaseGroup.mbid),
        exists(
          db
            .select({ id: release.id })
            .from(release)
            .where(and(eq(release.releaseGroupId, releaseGroup.id), eq(release.isRepresentative, true))),
        ),
      ),
    )
    .orderBy(asc(releaseGroup.createdAt));
  const pending = limit ? await pendingQuery.limit(limit) : await pendingQuery;

  console.log(`${dryRun ? "[DRY-RUN] " : ""}${pending.length} álbum(es) con ediciones pendientes\n`);

  const tally: Record<string, number> = {};
  const wouldChange: string[] = [];

  for (let i = 0; i < pending.length; i++) {
    const { id, title } = pending[i]!;
    try {
      const result = await syncReleaseEditions(id, { dryRun });
      tally[result.status] = (tally[result.status] ?? 0) + 1;
      if (result.status === "synced") {
        if (result.representativeWouldChange) {
          wouldChange.push(
            `${id} · ${title} · ${result.currentRepresentativeMbid ?? "—"} → ${result.chosenRepresentativeMbid}`,
          );
        }
        console.log(`[${i + 1}/${pending.length}] ${title} · ${result.editionCount} ediciones`);
      } else {
        console.log(`[${i + 1}/${pending.length}] ${title} · omitido`);
      }
    } catch (error) {
      tally.error = (tally.error ?? 0) + 1;
      console.error(`[${i + 1}/${pending.length}] ${title} · ERROR:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\nResumen: ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(" · ") || "nada"}`);
  if (reportRepresentative) {
    console.log(`\nRepresentativa distinta con todas las ediciones (${wouldChange.length}):`);
    for (const line of wouldChange) console.log(`  ${line}`);
    if (wouldChange.length > 0) {
      console.log("\nCorregir con: tsx --env-file=.env scripts/recanonicalize-release-group.ts <id>");
    }
  }
}

main()
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
