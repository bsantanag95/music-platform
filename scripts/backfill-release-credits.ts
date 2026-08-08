import { isNull } from "drizzle-orm";
import { db } from "@/db";
import { release } from "@/db/schema";
import { syncReleaseCredits } from "@/services/catalog/ingest-release";

/**
 * Script de backfill para sincronizar créditos de releases existentes.
 * Busca todos los releases donde creditsSyncedAt es NULL y sincroniza
 * sus créditos consultando MusicBrainz.
 *
 * Uso:
 *   pnpm tsx scripts/backfill-release-credits.ts
 *
 * Requiere DATABASE_URL en el entorno.
 */
async function main() {
  console.log("Buscando releases sin créditos sincronizados...");

  const releases = await db
    .select()
    .from(release)
    .where(isNull(release.creditsSyncedAt));

  if (releases.length === 0) {
    console.log("No hay releases pendientes de sincronización.");
    return;
  }

  console.log(`Encontrados ${releases.length} releases pendientes.`);

  for (let i = 0; i < releases.length; i++) {
    const r = releases[i];
    if (!r) continue;
    console.log(`[${i + 1}/${releases.length}] Sincronizando release ${r.id} (mbid: ${r.mbid})...`);

    try {
      await syncReleaseCredits(r);
      console.log(`  ✓ Sincronizado`);
    } catch (error) {
      console.error(`  ✗ Error:`, error instanceof Error ? error.message : error);
    }
  }

  console.log("\nBackfill completado.");
}

main()
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
