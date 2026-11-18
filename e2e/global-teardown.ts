// Borra los datos de los E2E (prefijo `e2e00000-` / usuarios `e2e_*`), también si los tests fallaron.

import { assertScratchDatabase, loadE2eEnv } from "./lib/env";
import { runSeed } from "./lib/run-seed";

export default async function globalTeardown(): Promise<void> {
  loadE2eEnv();
  assertScratchDatabase();
  runSeed("cleanup");
}
