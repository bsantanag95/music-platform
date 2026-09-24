import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { release, releaseGroup } from "@/db/schema";
import { syncPersonnelCredits } from "@/services/catalog/personnel-credits";

/**
 * Sincroniza los créditos de personal (instrumentos, voz, producción, ingeniería, arte) de
 * las ediciones representativas ingeridas antes de que existieran (openspec:
 * enrich-album-editions-and-credits). Es lo mismo que hace la página de álbum en segundo
 * plano, en lote: una request a MusicBrainz por álbum, más las pertenencias de la banda
 * cuando todavía no se sincronizaron.
 *
 * Uso:
 *   tsx --env-file=.env scripts/backfill-personnel-credits.ts [--limit N] [--dry-run]
 *
 * `--dry-run` pide los créditos y los cuenta, sin escribir.
 * `--limit N` procesa como máximo N álbumes pendientes (por antigüedad).
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
  const limit = parseLimit(args);

  const pendingQuery = db
    .select({ releaseGroupId: releaseGroup.id, title: releaseGroup.title })
    .from(release)
    .innerJoin(releaseGroup, eq(releaseGroup.id, release.releaseGroupId))
    .where(and(eq(release.isRepresentative, true), isNull(release.personnelSyncedAt), isNotNull(release.mbid)))
    .orderBy(asc(releaseGroup.createdAt));
  const pending = limit ? await pendingQuery.limit(limit) : await pendingQuery;

  console.log(`${dryRun ? "[DRY-RUN] " : ""}${pending.length} álbum(es) con créditos de personal pendientes\n`);

  const tally: Record<string, number> = {};
  for (let i = 0; i < pending.length; i++) {
    const { releaseGroupId, title } = pending[i]!;
    try {
      const result = await syncPersonnelCredits(releaseGroupId, { dryRun });
      tally[result.status] = (tally[result.status] ?? 0) + 1;
      const detail = result.status === "synced" ? `${result.creditCount} créditos` : "omitido";
      console.log(`[${i + 1}/${pending.length}] ${title} · ${detail}`);
    } catch (error) {
      tally.error = (tally.error ?? 0) + 1;
      console.error(`[${i + 1}/${pending.length}] ${title} · ERROR:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\nResumen: ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(" · ") || "nada"}`);
}

main()
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
