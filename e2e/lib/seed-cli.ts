// Ejecuta la siembra/limpieza de los E2E en su propio proceso con `tsx` (resuelve el alias `@/` y los módulos
// nativos como argon2 igual que el resto de `scripts/`). Lo invoca el setup global de Playwright.
//
//   node --import tsx e2e/lib/seed-cli.ts seed|cleanup

import { mkdirSync, writeFileSync } from "node:fs";
import { albumHref, artistHref } from "../../src/lib/catalog-links";
import { ALBUM_TITLE, ARTIST_NAME, SEED_FILE, USER } from "./fixtures";
import { assertScratchDatabase, loadE2eEnv } from "./env";
import { cleanupE2eData, seedE2eData } from "./seed";

async function main(): Promise<void> {
  loadE2eEnv();
  // Antes de escribir o borrar nada: si la BD no es de scratch, abortar.
  assertScratchDatabase();
  const command = process.argv[2];
  if (command === "seed") {
    const seeded = await seedE2eData();
    // Rutas canónicas para los tests y el calentamiento (sin prefijo de idioma).
    mkdirSync("e2e/.auth", { recursive: true });
    writeFileSync(
      SEED_FILE,
      JSON.stringify({
        albumPath: albumHref(ARTIST_NAME, ALBUM_TITLE, seeded.releaseGroupId),
        artistPath: artistHref(ARTIST_NAME, seeded.artistId),
        profilePath: `/users/${USER.username}`,
        otherProfilePath: `/users/${USER.otherUsername}`,
      }),
    );
    console.log("[e2e] Datos de prueba sembrados.");
  } else if (command === "cleanup") {
    await cleanupE2eData();
    console.log("[e2e] Datos de prueba borrados.");
  } else {
    throw new Error("Uso: seed-cli.ts seed|cleanup");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
