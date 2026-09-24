import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup } from "@/db/schema";
import { isValidUuid } from "@/lib/validation";
import { takedownCover } from "@/services/catalog/cover-mirror";

/**
 * Retiro de una carátula a pedido (openspec: mirror-cover-art, ADR 0018).
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/takedown-cover.ts <releaseGroupId|mbid>
 *
 * Borra el objeto del storage si existe, anula `cover_thumb_url` y
 * `cover_storage_key` y fija `cover_blocked_at`. Un release-group marcado no
 * se vuelve a resolver ni a mostrar por hotlink. Imprime la sentencia para
 * revertir el retiro.
 */
async function main(): Promise<void> {
  const identifier = process.argv[2];
  if (!identifier || !isValidUuid(identifier)) {
    console.error("Uso: npx tsx --env-file=.env scripts/takedown-cover.ts <releaseGroupId|mbid>");
    process.exit(1);
  }

  const [rg] = await db
    .select()
    .from(releaseGroup)
    .where(or(eq(releaseGroup.id, identifier), eq(releaseGroup.mbid, identifier)))
    .limit(1);

  if (!rg) {
    console.error(`No existe un release-group con id/mbid ${identifier}.`);
    process.exit(1);
  }

  const result = await takedownCover(rg);

  console.log(`Retiro aplicado a release-group ${rg.id} (mbid: ${rg.mbid ?? "—"}).`);
  console.log(`  Objeto espejado: ${result.hadObject ? "sí" : "no"}`);
  if (result.hadObject) {
    console.log(`  Borrado del objeto: ${result.objectDeleted ? "ok" : "FALLÓ (revisar storage)"}`);
  }
  console.log("Para revertir el retiro:");
  console.log(`  UPDATE release_group SET cover_blocked_at = NULL WHERE id = '${rg.id}';`);
}

main()
  .catch((error) => {
    console.error("Error fatal:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
