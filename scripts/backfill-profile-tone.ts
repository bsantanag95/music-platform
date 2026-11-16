import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { appUser, releaseGroup, userShowcase } from "@/db/schema";
import { fetchImageBytes } from "@/services/share/images";
import { refreshProfileTone, toneFromImage } from "@/services/profiles/tone";

/**
 * Calcula el tono de los perfiles que ya tienen álbum definitorio (openspec:
 * redesign-user-profile-phase3, migración 0097). El tono se calcula al elegir el
 * álbum; este script cubre los perfiles anteriores al cambio y sirve para
 * recalcular si cambian las carátulas. Idempotente: volver a correrlo da el mismo
 * resultado.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/backfill-profile-tone.ts [--dry-run]
 *
 * `--dry-run` calcula y muestra el tono de cada perfil sin guardar nada.
 */
function parseArgs(argv: string[]): { dryRun: boolean } {
  const options = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") options.dryRun = true;
    else {
      console.error(`Argumento desconocido: ${arg}`);
      process.exit(1);
    }
  }
  return options;
}

async function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const rows = await db
    .select({
      userId: userShowcase.userId,
      username: appUser.username,
      current: userShowcase.profileTone,
      cover: releaseGroup.coverThumbUrl,
    })
    .from(userShowcase)
    .innerJoin(appUser, eq(appUser.id, userShowcase.userId))
    .leftJoin(releaseGroup, eq(releaseGroup.id, userShowcase.definingReleaseGroupId))
    .where(isNotNull(userShowcase.definingReleaseGroupId));

  const totals = { saved: 0, amber: 0, unavailable: 0 };
  for (const row of rows) {
    if (dryRun) {
      const bytes = row.cover ? await fetchImageBytes(row.cover) : null;
      const tone = row.cover && !bytes ? undefined : bytes ? await toneFromImage(bytes) : null;
      console.log(`@${row.username}: ${row.current ?? "ámbar"} → ${tone === undefined ? "(carátula no disponible)" : (tone ?? "ámbar")}`);
      if (tone === undefined) totals.unavailable += 1;
      else if (tone) totals.saved += 1;
      else totals.amber += 1;
      continue;
    }
    const result = await refreshProfileTone(row.userId);
    if (result.status === "unavailable") {
      totals.unavailable += 1;
      console.log(`@${row.username}: carátula no disponible, sin cambios`);
    } else {
      if (result.tone) totals.saved += 1;
      else totals.amber += 1;
      console.log(`@${row.username}: ${result.tone ?? "ámbar"}`);
    }
  }
  console.log(
    `${dryRun ? "[dry-run] " : ""}${rows.length} perfiles: ${totals.saved} con tono, ${totals.amber} en ámbar, ` +
      `${totals.unavailable} sin carátula disponible.`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
