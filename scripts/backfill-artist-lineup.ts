import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { artist } from "@/db/schema";
import { syncArtistProfileFacts } from "@/services/catalog/artist-profile";

/**
 * Guarda con períodos y músicos de apoyo la alineación de los artistas ya sincronizados antes de
 * la migración 0055 (openspec: add-artist-lineup-data): la misma actualización que la página de
 * artista programa en segundo plano (ficha y alineación con una sola request a MusicBrainz, sin
 * Wikimedia), en lote y en serie por la cola de MusicBrainz.
 *
 * Uso:
 *   tsx --env-file=.env scripts/backfill-artist-lineup.ts [--limit N] [--dry-run] [--artist <uuid>]
 *
 * `--dry-run` consulta MusicBrainz e informa lo que se guardaría, sin escribir.
 * `--limit N` procesa como máximo N artistas pendientes (por antigüedad).
 * `--artist <uuid>` procesa un solo artista (aunque no esté pendiente).
 * Requiere DATABASE_URL y MUSICBRAINZ_USER_AGENT en el entorno.
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

  // Pendientes: la sincronización fría ya pasó (hay pertenencias guardadas sin períodos).
  const pendingQuery = db
    .select({ id: artist.id, name: artist.name })
    .from(artist)
    .where(
      onlyArtist
        ? eq(artist.id, onlyArtist)
        : and(isNotNull(artist.mbid), isNotNull(artist.membershipsSyncedAt), isNull(artist.lineupSyncedAt)),
    )
    .orderBy(asc(artist.createdAt));
  const pending = limit ? await pendingQuery.limit(limit) : await pendingQuery;

  console.log(`${dryRun ? "[DRY-RUN] " : ""}${pending.length} artista(s) con alineación pendiente\n`);
  const tally: Record<string, number> = {};

  for (let i = 0; i < pending.length; i++) {
    const { id, name } = pending[i]!;
    let status: string;
    try {
      status = (await syncArtistProfileFacts(id, { dryRun, force: Boolean(onlyArtist) })).status;
    } catch (error) {
      status = "error";
      console.error(`  ${name}:`, error instanceof Error ? error.message : error);
    }
    tally[status] = (tally[status] ?? 0) + 1;
    console.log(`[${i + 1}/${pending.length}] ${name} · ${status}`);
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
