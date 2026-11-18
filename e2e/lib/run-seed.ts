// Lanza `seed-cli.ts` en un proceso aparte (ver ese archivo) y propaga su fallo al setup de Playwright.

import { execFileSync } from "node:child_process";

export function runSeed(command: "seed" | "cleanup"): void {
  execFileSync(process.execPath, ["--import", "tsx", "e2e/lib/seed-cli.ts", command], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
}
