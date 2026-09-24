import { and, eq, isNotNull, isNull, like } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup } from "@/db/schema";
import { COVER_MIRROR } from "@/lib/config/cover-mirror";
import { coverThumbUrl, fetchCoverThumb } from "@/services/cover-art";
import { getStorageProvider } from "@/services/storage";
import { isCoverMirrorEnabled, mirrorCover } from "@/services/catalog/cover-mirror";

/**
 * Backfill del espejo de carátulas (openspec: mirror-cover-art, ADR 0018).
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/backfill-cover-mirror.ts [--limit=N] [--rewrite-urls] [--revert]
 *
 * Por defecto espeja las filas cuya `cover_thumb_url` apunta a Cover Art
 * Archive (sin retiro), con la concurrencia configurada. `--rewrite-urls`
 * recalcula `cover_thumb_url` desde `cover_storage_key` (por ejemplo si cambió
 * el dominio público). `--revert` vuelve cada fila espejada a la URL de CAA
 * sin borrar los objetos. Aborta si el espejo no está habilitado, salvo en
 * `--revert`.
 */
const DEFAULT_LIMIT = 100;

interface Options {
  limit: number;
  rewriteUrls: boolean;
  revert: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { limit: DEFAULT_LIMIT, rewriteUrls: false, revert: false };
  for (const arg of argv) {
    if (arg === "--rewrite-urls") options.rewriteUrls = true;
    else if (arg === "--revert") options.revert = true;
    else if (arg.startsWith("--limit=")) {
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

async function runRevert(limit: number): Promise<void> {
  const rows = await db
    .select()
    .from(releaseGroup)
    .where(isNotNull(releaseGroup.coverStorageKey))
    .limit(limit);

  let reverted = 0;
  for (const rg of rows) {
    if (!rg.mbid) continue;
    await db
      .update(releaseGroup)
      .set({ coverThumbUrl: coverThumbUrl(rg.mbid), coverStorageKey: null })
      .where(eq(releaseGroup.id, rg.id));
    reverted += 1;
  }
  console.log(`Revertidas ${reverted} filas a URLs de Cover Art Archive (objetos conservados).`);
}

async function runRewriteUrls(limit: number): Promise<void> {
  const rows = await db
    .select()
    .from(releaseGroup)
    .where(isNotNull(releaseGroup.coverStorageKey))
    .limit(limit);

  const provider = getStorageProvider();
  let rewritten = 0;
  for (const rg of rows) {
    if (!rg.coverStorageKey) continue;
    await db
      .update(releaseGroup)
      .set({ coverThumbUrl: provider.publicUrl(rg.coverStorageKey) })
      .where(eq(releaseGroup.id, rg.id));
    rewritten += 1;
  }
  console.log(`Reescritas ${rewritten} URLs desde cover_storage_key.`);
}

async function runMirror(limit: number): Promise<void> {
  const rows = await db
    .select()
    .from(releaseGroup)
    .where(
      and(
        isNotNull(releaseGroup.coverThumbUrl),
        isNull(releaseGroup.coverStorageKey),
        isNull(releaseGroup.coverBlockedAt),
        like(releaseGroup.coverThumbUrl, "https://coverartarchive.org/%"),
      ),
    )
    .limit(limit);

  const summary = { processed: 0, mirrored: 0, missing: 0, errors: 0 };

  await mapWithConcurrency(rows, COVER_MIRROR.backfillConcurrency, async (rg) => {
    summary.processed += 1;
    if (!rg.mbid) {
      summary.errors += 1;
      return;
    }

    const fetched = await fetchCoverThumb(rg.mbid);
    if (fetched.status === "transient") {
      summary.errors += 1;
      return;
    }
    if (fetched.status === "missing") {
      summary.missing += 1;
      return;
    }

    const url = await mirrorCover(rg, fetched.bytes);
    if (url === coverThumbUrl(rg.mbid)) {
      // La conversión o el `put` fallaron: quedó la URL de CAA.
      summary.errors += 1;
    } else {
      summary.mirrored += 1;
    }
  });

  console.log(
    `Backfill: ${summary.processed} procesadas, ${summary.mirrored} espejadas, ` +
      `${summary.missing} faltantes, ${summary.errors} errores.`,
  );
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.revert) {
    await runRevert(options.limit);
    return;
  }

  if (!isCoverMirrorEnabled()) {
    console.error(
      "El espejo no está habilitado: falta storage configurado o COVER_ART_TAKEDOWN_EMAIL.",
    );
    process.exit(1);
  }

  if (options.rewriteUrls) {
    await runRewriteUrls(options.limit);
    return;
  }

  await runMirror(options.limit);
}

main()
  .catch((error) => {
    console.error("Error fatal:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
