// Entorno de los E2E: carga `.env`, exige una BD de scratch y corta toda salida a servicios externos.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { judgeSmokeDb } from "../../scripts/verify/lib/env";

/** Variables que, vacías, hacen que los clientes externos fallen cerrado (ver AGENTS.md, arquitectura). */
const EXTERNAL_USER_AGENTS = ["MUSICBRAINZ_USER_AGENT", "WIKIMEDIA_USER_AGENT", "LISTENBRAINZ_USER_AGENT"] as const;

export function loadE2eEnv(): void {
  const envFile = resolve(process.cwd(), ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

/**
 * Aborta si `DATABASE_URL` no es de scratch (misma regla que `pnpm run verify`): los E2E crean y borran
 * datos con prefijo propio, pero nunca deben correr contra la BD real.
 */
export function assertScratchDatabase(): void {
  const allowed = (process.env.VERIFY_ALLOWED_DB ?? "").split(",").filter(Boolean);
  const verdict = judgeSmokeDb(process.env.DATABASE_URL, allowed);
  if (!verdict.allowed) {
    throw new Error(
      `E2E abortados antes de crear datos: ${verdict.reason}\n` +
        "Usa una BD de scratch (p. ej. music_platform_scratch) con las migraciones aplicadas.",
    );
  }
}

/**
 * Entorno del servidor que levanta Playwright: sin user agents externos, así MusicBrainz, Wikimedia y
 * ListenBrainz fallan cerrados y ningún test sale a internet.
 */
export function serverEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined) env[key] = value;
  for (const key of EXTERNAL_USER_AGENTS) env[key] = "";
  env.NEXT_TELEMETRY_DISABLED = "1";
  return env;
}
