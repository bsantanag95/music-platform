export {};

// Seed de la superficie de descubrimiento `/explore` (openspec: add-album-discovery y
// automate-explore-collections).
//
// Crea la cuenta curadora `exploracion` (sin password_hash — no puede iniciar sesión; perfil
// público) y genera las colecciones destacadas con las mismas plantillas que usa `/explore` cada
// semana (src/services/discovery/collections). No inventa catálogo: las colecciones se arman con los
// release_group que YA están en la BD. Idempotente.
//
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/seed-discovery.ts
//
// Para regenerar solo las colecciones (cuenta ya creada): scripts/sync-explore-collections.ts.
// Para limpiar todo lo que sembró este script:
//   DELETE FROM app_user WHERE username = 'exploracion';
// (cascade borra sus listas, ítems y filas user_list_featured)

import { eq } from "drizzle-orm";
import { assertSeedAllowed } from "./assert-seed-allowed";
import { db } from "../src/db";
import { appUser } from "../src/db/schema";
import { CURATOR_DISPLAY_NAME, CURATOR_USERNAME } from "../src/services/discovery/constants";
import { syncCollections } from "../src/services/discovery/collections/sync";

assertSeedAllowed();

const CURATOR_EMAIL = "exploracion@curator.local";

async function upsertCurator(): Promise<string> {
  const [existing] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.username, CURATOR_USERNAME))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(appUser)
    .values({
      username: CURATOR_USERNAME,
      email: CURATOR_EMAIL,
      displayName: CURATOR_DISPLAY_NAME,
      passwordHash: null,
      profileVisibility: "public",
    })
    .onConflictDoNothing({ target: appUser.username })
    .returning({ id: appUser.id });
  if (created) return created.id;

  const [conflict] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.username, CURATOR_USERNAME))
    .limit(1);
  if (!conflict) throw new Error("No se pudo crear ni resolver la cuenta curadora");
  return conflict.id;
}

async function main() {
  const ownerId = await upsertCurator();
  console.log(`Cuenta curadora: @${CURATOR_USERNAME} (${ownerId})`);
  for (const result of await syncCollections({ force: true })) {
    if (result.status === "failed") throw new Error(`"${result.key}": ${result.error}`);
    if (result.status === "skipped") console.warn(`  – ${result.key}: otra corrida en curso, se omite`);
    else if (result.generated) console.log(`  ✓ ${result.key}: ${result.items} álbumes`);
    else console.warn(`  ⚠ ${result.key}: ${result.items} álbumes (menos del mínimo), se omite`);
  }
  console.log("Seed de descubrimiento al día.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error en el seed de descubrimiento:", error);
    process.exit(1);
  });
