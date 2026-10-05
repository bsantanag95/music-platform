import { sql } from "drizzle-orm";
import { db } from "@/db";
import { enrichGenreFromWikimedia } from "@/services/genres/about-sync";
import { GENRE_ABOUT_REFRESH_MS } from "@/services/genres/constants";

/**
 * Rellena el texto "Sobre el género" (openspec: redesign-genre-page, ADR 0027): para cada género de
 * estilo, la descripción de Wikidata y la introducción del artículo de Wikipedia en español e inglés,
 * llegando a Wikidata solo por `genre.wikidata_id`. Es lo mismo que hace la página de género en segundo
 * plano, en lote.
 *
 * Uso:
 *   tsx --env-file=.env scripts/backfill-genre-about.ts [--limit N] [--dry-run] [--force] [--slug <slug>]
 *
 * Orden: primero los géneros con más álbumes (los que más se visitan). Reanudable: omite los vigentes
 * (menos de 30 días), así que se puede interrumpir y volver a correr sin repetir trabajo.
 * `--dry-run` consulta Wikimedia e informa lo que se guardaría, sin escribir.
 * `--limit N` procesa como máximo N géneros pendientes.
 * `--force` ignora la vigencia de 30 días; con `--slug <slug>` actualiza un solo género.
 * Un solo proceso: respeta la cola serial del cliente de Wikimedia. Requiere DATABASE_URL y
 * WIKIMEDIA_USER_AGENT en el entorno.
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

interface PendingGenre {
  id: string;
  slug: string;
  albums: number;
}

async function pendingGenres(slug: string | undefined, force: boolean, limit: number | undefined): Promise<PendingGenre[]> {
  const stale = force ? sql`TRUE` : sql`(g.wikimedia_synced_at IS NULL OR g.wikimedia_synced_at < now() - ${`${GENRE_ABOUT_REFRESH_MS} milliseconds`}::interval)`;
  const only = slug ? sql`g.slug = ${slug}` : sql`TRUE`;
  const rows = await db.execute<{ id: string; slug: string; albums: number }>(sql`
    SELECT g.id, g.slug, COALESCE(c.albums, 0)::int AS albums
    FROM genre g
    LEFT JOIN (
      SELECT genre_id, count(DISTINCT release_group_id) AS albums
      FROM release_group_effective_genre
      GROUP BY genre_id
    ) c ON c.genre_id = g.id
    WHERE g.kind = 'style' AND ${stale} AND ${only}
    ORDER BY albums DESC, g.slug ASC
    ${limit ? sql`LIMIT ${limit}` : sql``}
  `);
  return rows.map((r) => ({ id: r.id, slug: r.slug, albums: Number(r.albums) }));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const limit = parseLimit(args);
  const slug = parseOption(args, "--slug");
  if (slug && !force) {
    console.error("--slug se usa con --force (para adelantar la sincronización de un solo género)");
    process.exit(1);
  }

  const pending = await pendingGenres(slug, force, limit);
  console.log(`${dryRun ? "[DRY-RUN] " : ""}${pending.length} género(s) pendiente(s)\n`);
  const tally: Record<string, number> = {};

  for (let i = 0; i < pending.length; i++) {
    const { id, slug: genreSlug, albums } = pending[i]!;
    try {
      const result = await enrichGenreFromWikimedia(id, { dryRun, force });
      tally[result.status] = (tally[result.status] ?? 0) + 1;
      const detail =
        result.status === "enriched"
          ? ` · es ${result.texts.es.summaryTitle ?? "—"} · en ${result.texts.en.summaryTitle ?? "—"}${result.failures.length ? ` · fallos: ${result.failures.join(", ")}` : ""}`
          : "";
      console.log(`[${i + 1}/${pending.length}] ${genreSlug} (${albums} álbumes) · ${result.status}${detail}`);
    } catch (error) {
      // Un género que falla queda pendiente; el relleno sigue con el resto.
      tally.error = (tally.error ?? 0) + 1;
      console.error(`[${i + 1}/${pending.length}] ${genreSlug} · error: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`\nResumen: ${Object.entries(tally).map(([k, v]) => `${k}=${v}`).join(" · ") || "nada"}`);
}

main()
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
