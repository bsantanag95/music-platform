import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { artist } from "@/db/schema";
import { syncArtistDiscography } from "@/services/catalog/ingest-discography";

/**
 * Completa las discografías guardadas antes de la ingesta paginada (openspec:
 * fix-artist-discography-ingestion): la ingesta anterior se cortaba en 100 release-groups
 * y no filtraba bootlegs. Es lo mismo que hace la página de artista en segundo plano, en
 * lote: recorre todas las páginas sin bootlegs, guarda los tipos crudos y marca los
 * release-groups que quedan fuera de la discografía (sin borrarlos).
 *
 * Uso:
 *   tsx --env-file=.env scripts/backfill-artist-discography.ts [--limit N] [--dry-run] [--artist <uuid>]
 *
 * `--dry-run` recorre MusicBrainz e informa cuántos release-groups se guardarían, se
 * marcarían y se desmarcarían, sin escribir.
 * `--limit N` procesa como máximo N artistas pendientes (por antigüedad).
 * `--artist <uuid>` procesa un solo artista, esté pendiente o no (si está al día, se omite).
 * El cliente de MusicBrainz ya respeta el rate limit (≥1,1 s entre requests).
 *
 * Requiere DATABASE_URL en el entorno.
 */

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

function parseLimit(args: string[]): number | undefined {
  const raw = parseOption(args, "--limit");
  if (raw === undefined) return undefined;
  const value = Number(raw);
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
  const onlyArtist = parseOption(args, "--artist");

  const pendingQuery = db
    .select({ id: artist.id, name: artist.name })
    .from(artist)
    .where(
      onlyArtist
        ? eq(artist.id, onlyArtist)
        : and(isNotNull(artist.discographySyncedAt), isNull(artist.discographyCompleteAt), isNotNull(artist.mbid)),
    )
    .orderBy(asc(artist.createdAt));
  const pending = limit ? await pendingQuery.limit(limit) : await pendingQuery;

  console.log(`${dryRun ? "[DRY-RUN] " : ""}${pending.length} artista(s) con discografía pendiente\n`);

  const tally: Record<string, number> = {};
  const totals = { saved: 0, unlisted: 0, relisted: 0 };

  for (let i = 0; i < pending.length; i++) {
    const { id, name } = pending[i]!;
    const prefix = `[${i + 1}/${pending.length}] ${name}`;
    try {
      const result = await syncArtistDiscography(id, { mode: "full", dryRun });
      tally[result.status] = (tally[result.status] ?? 0) + 1;
      if (result.status === "complete") {
        totals.saved += result.saved;
        totals.unlisted += result.unlisted;
        totals.relisted += result.relisted;
        const truncated = result.truncated ? " · TOPE DE PÁGINAS" : "";
        console.log(
          `${prefix} · ${result.saved} de ${result.total} · fuera ${result.unlisted} · vuelven ${result.relisted}${truncated}`,
        );
      } else {
        console.log(`${prefix} · omitido (al día o sin MBID)`);
      }
    } catch (error) {
      tally.error = (tally.error ?? 0) + 1;
      console.error(`${prefix} · ERROR:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\nResumen: ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(" · ") || "nada"}`);
  console.log(
    `Release-groups ${dryRun ? "que se guardarían" : "guardados"}: ${totals.saved} · fuera de la discografía: ${totals.unlisted} · vuelven: ${totals.relisted}`,
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
