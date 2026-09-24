import { and, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup } from "@/db/schema";
import { COVER_MIRROR } from "@/lib/config/cover-mirror";
import { getStorageProvider } from "@/services/storage";
import { revalidateCover } from "@/services/catalog/cover-mirror";

/**
 * Revalidación del espejo de carátulas (openspec: mirror-cover-art, ADR 0018).
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/revalidate-cover-mirror.ts [--older-than=90d] [--limit=N]
 *
 * Vuelve a descargar de Cover Art Archive las carátulas espejadas cuya última
 * verificación concluyente sea más vieja que el umbral (o no esté registrada).
 * `404` borra el objeto y anula la fila; un hash distinto sube la clave nueva y
 * borra la anterior; un error transitorio no toca nada. Se documenta correrlo
 * periódicamente (por ejemplo, mensual).
 */
const DEFAULT_LIMIT = 200;

interface Options {
  olderThanMs: number;
  limit: number;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    olderThanMs: COVER_MIRROR.revalidateDays * 24 * 60 * 60 * 1000,
    limit: DEFAULT_LIMIT,
  };
  for (const arg of argv) {
    if (arg.startsWith("--older-than=")) {
      const match = /^(\d+)d$/.exec(arg.slice("--older-than=".length));
      if (!match) {
        console.error("--older-than debe tener el formato <días>d (ej. --older-than=90d).");
        process.exit(1);
      }
      options.olderThanMs = Number.parseInt(match[1]!, 10) * 24 * 60 * 60 * 1000;
    } else if (arg.startsWith("--limit=")) {
      const value = Number.parseInt(arg.slice("--limit=".length), 10);
      if (Number.isFinite(value) && value > 0) options.limit = value;
    } else {
      console.error(`Argumento desconocido: ${arg}`);
      process.exit(1);
    }
  }
  return options;
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      const item = items[current];
      if (item) await worker(item);
    }
  });
  await Promise.all(runners);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  // `getStorageProvider()` exige storage: revalidar sin él no tendría sentido.
  try {
    getStorageProvider();
  } catch {
    console.error("El espejo no está habilitado: falta storage configurado.");
    process.exit(1);
  }

  const threshold = new Date(Date.now() - options.olderThanMs);
  const rows = await db
    .select()
    .from(releaseGroup)
    .where(
      and(
        isNotNull(releaseGroup.coverStorageKey),
        isNull(releaseGroup.coverBlockedAt),
        or(isNull(releaseGroup.coverCheckedAt), lt(releaseGroup.coverCheckedAt, threshold)),
      ),
    )
    .limit(options.limit);

  const summary = { processed: 0, updated: 0, missing: 0, unchanged: 0, errors: 0 };

  await mapWithConcurrency(rows, COVER_MIRROR.backfillConcurrency, async (rg) => {
    summary.processed += 1;
    try {
      const result = await revalidateCover(rg);
      if (result === "updated") summary.updated += 1;
      else if (result === "missing") summary.missing += 1;
      else if (result === "unchanged") summary.unchanged += 1;
      else summary.errors += 1;
    } catch {
      summary.errors += 1;
    }
  });

  console.log(
    `Revalidación: ${summary.processed} procesadas, ${summary.updated} actualizadas, ` +
      `${summary.missing} retiradas en la fuente, ${summary.unchanged} sin cambios, ` +
      `${summary.errors} errores.`,
  );
}

main()
  .catch((error) => {
    console.error("Error fatal:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
