// Setup global de los E2E: guardia de BD → siembra → sesión del usuario de prueba (storageState).
// El servidor de `webServer` ya está arriba cuando esto corre.

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium, request } from "@playwright/test";
import { E2E_BASE_URL, STORAGE_STATE, USER } from "./lib/fixtures";
import { assertScratchDatabase, loadE2eEnv } from "./lib/env";
import { es, seedPaths } from "./lib/paths";
import { runSeed } from "./lib/run-seed";

export default async function globalSetup(): Promise<void> {
  loadE2eEnv();
  assertScratchDatabase();
  runSeed("seed");

  // Sesión por API (el flujo de login por formulario se prueba aparte en login.e2e.ts).
  const context = await request.newContext({ baseURL: E2E_BASE_URL });
  const response = await context.post("/api/auth/login", {
    data: { identifier: USER.username, password: USER.password, remember: true },
  });
  if (!response.ok()) {
    throw new Error(`El login del usuario de prueba falló (${response.status()}): ${await response.text()}`);
  }
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  await context.storageState({ path: STORAGE_STATE });
  await context.dispose();

  await warmUp();
}

/**
 * `next dev` compila cada ruta (y sus chunks de cliente) al primer acceso, y un chunk a medio compilar deja la página
 * sin hidratar. Se recorren una vez las rutas de los flujos, con sesión, para que los tests ya las encuentren listas.
 */
async function warmUp(): Promise<void> {
  const paths = seedPaths();
  const browser = await chromium.launch({ channel: process.env.E2E_CHANNEL || undefined });
  try {
    const context = await browser.newContext({ baseURL: E2E_BASE_URL, storageState: STORAGE_STATE });
    const page = await context.newPage();
    const routes = [
      "/es",
      "/es/auth/login",
      es("/search?q=E2E"),
      es(paths.albumPath),
      es(paths.artistPath),
      es(paths.profilePath),
      es(paths.otherProfilePath),
      es("/me/ratings"),
      es("/me/lists"),
    ];
    for (const route of routes) {
      await page.goto(route, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => undefined);
    }
    await context.close();
  } finally {
    await browser.close();
  }
}
