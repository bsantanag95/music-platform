// Config de los E2E (change strengthen-verification-loop, fase 2). Se ejecutan con `pnpm run test:e2e`, aparte de
// `pnpm test` (vitest). Corren contra una BD de scratch sembrada por `e2e/global-setup.ts` y un servidor Next sin
// user agents externos (MusicBrainz, Wikimedia y ListenBrainz fallan cerrados: ningún test sale a internet).
//
//   E2E_PORT=3417          puerto del servidor de prueba
//   E2E_CHANNEL=msedge     usar Edge/Chrome instalado en lugar del Chromium de Playwright (evita descargarlo)
//   E2E_SERVER=dev         usar `next dev` en vez del build de producción (más rápido de arrancar, pero inestable: ver abajo)
//   E2E_SKIP_BUILD=1       reutilizar el `.next` ya construido (solo si no cambió el código)

import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_PORT, STORAGE_STATE } from "./e2e/lib/fixtures";
import { assertScratchDatabase, loadE2eEnv, serverEnv } from "./e2e/lib/env";

loadE2eEnv();
// Antes de levantar el servidor o tocar la BD: si `DATABASE_URL` no es de scratch, abortar aquí.
assertScratchDatabase();

// Por defecto se sirve un build de producción: `next dev` compila cada ruta al primer acceso y un chunk a medio compilar deja la
// página sin hidratar (los clics llegan antes que los handlers), lo que vuelve inestables los tests.
const serveBuild = process.env.E2E_SERVER !== "dev";
const buildStep = process.env.E2E_SKIP_BUILD === "1" ? "" : "pnpm exec next build && ";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts$/,
  // Sin reintentos: un test inestable se arregla en su causa o se elimina; reintentar lo esconde.
  retries: 0,
  // Un solo worker: los flujos comparten el usuario y la BD de prueba.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/.report" }]],
  outputDir: "e2e/.results",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: E2E_BASE_URL,
    // Sesión del usuario de prueba (la crea el setup global); login.e2e.ts la reemplaza por una vacía.
    storageState: STORAGE_STATE,
    locale: "es-CL",
    timezoneId: "America/Santiago",
    // Evidencia ante un fallo: traza y captura del paso fallido.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: process.env.E2E_CHANNEL || undefined },
    },
  ],
  webServer: {
    command: serveBuild
      ? `${buildStep}pnpm exec next start -p ${E2E_PORT}`
      : `pnpm exec next dev -p ${E2E_PORT}`,
    url: `${E2E_BASE_URL}/es`,
    reuseExistingServer: false,
    timeout: serveBuild ? 600_000 : 180_000,
    env: serverEnv(),
    stdout: "ignore",
    stderr: "pipe",
  },
});
