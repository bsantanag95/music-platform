// Rutas de lo sembrado, leídas del archivo que escribe el setup global.

import { readFileSync } from "node:fs";
import { SEED_FILE, type SeedPaths } from "./fixtures";

export function seedPaths(): SeedPaths {
  return JSON.parse(readFileSync(SEED_FILE, "utf8")) as SeedPaths;
}

/** Ruta con prefijo de idioma (los E2E corren en español). */
export function es(path: string): string {
  return `/es${path}`;
}
