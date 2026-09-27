import { and, asc, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { artist } from "@/db/schema";
import { refreshArtistProfile } from "@/services/catalog/artist-profile-sync";

/**
 * Completa el perfil de los artistas existentes (openspec: enrich-artist-profile, ADR 0021):
 * la ficha de MusicBrainz (país, lugares, fechas, enlaces) y, desde la relación `wikidata`,
 * la foto libre de Commons con su crédito, la descripción, el resumen de Wikipedia y el lugar
 * de nacimiento o formación. Es lo mismo que hace la página de artista en segundo plano, en
 * lote.
 *
 * Uso:
 *   tsx --env-file=.env scripts/backfill-artist-profile.ts [--limit N] [--dry-run] [--artist <uuid>] [--force]
 *
 * `--dry-run` consulta MusicBrainz y Wikimedia e informa lo que se guardaría, sin escribir.
 * `--limit N` procesa como máximo N artistas pendientes (por antigüedad).
 * `--artist <uuid>` procesa un solo artista.
 * `--force` ignora la vigencia de 30 días.
 * Requiere DATABASE_URL, MUSICBRAINZ_USER_AGENT y WIKIMEDIA_USER_AGENT en el entorno.
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
  const force = args.includes("--force");
  const limit = parseLimit(args);
  const onlyArtist = parseOption(args, "--artist");

  const pendingQuery = db
    .select({ id: artist.id, name: artist.name })
    .from(artist)
    .where(
      onlyArtist
        ? eq(artist.id, onlyArtist)
        : and(isNotNull(artist.mbid), or(isNull(artist.profileSyncedAt), isNull(artist.wikimediaSyncedAt))),
    )
    .orderBy(asc(artist.createdAt));
  const pending = limit ? await pendingQuery.limit(limit) : await pendingQuery;

  console.log(`${dryRun ? "[DRY-RUN] " : ""}${pending.length} artista(s) con perfil pendiente\n`);
  const tally: Record<string, number> = {};

  for (let i = 0; i < pending.length; i++) {
    const { id, name } = pending[i]!;
    const result = await refreshArtistProfile(id, { dryRun, force });
    for (const [step, status] of Object.entries(result)) tally[`${step}:${status}`] = (tally[`${step}:${status}`] ?? 0) + 1;
    console.log(`[${i + 1}/${pending.length}] ${name} · ficha ${result.facts} · wikimedia ${result.wikimedia}`);
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
