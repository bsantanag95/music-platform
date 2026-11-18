// Precondiciones de `verify` (task 1.1): confirma el worktree, asegura el `.env` y decide si es seguro
// correr smoke tests contra la BD de DATABASE_URL. Imprime un JSON (sin contraseñas) y sale con código
// distinto de cero solo si no se puede verificar nada (no es un repo git o no hay `.env` en ningún lado).
//
//   node --import tsx scripts/verify/preflight.ts

import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnvFile, judgeSmokeDb } from "./lib/env";
import { repoRoots } from "./lib/git";

export interface PreflightReport {
  ok: boolean;
  toplevel: string;
  mainRoot: string;
  isWorktree: boolean;
  envPresent: boolean;
  envCopied: boolean;
  database: string | null;
  smokeAllowed: boolean;
  smokeReason: string;
  error?: string;
}

export function runPreflight(cwd: string = process.cwd()): PreflightReport {
  let roots;
  try {
    roots = repoRoots(cwd);
  } catch {
    return {
      ok: false,
      toplevel: cwd,
      mainRoot: cwd,
      isWorktree: false,
      envPresent: false,
      envCopied: false,
      database: null,
      smokeAllowed: false,
      smokeReason: "No es un repositorio git.",
      error: "No es un repositorio git: corre `verify` desde el worktree del cambio.",
    };
  }

  const envPath = join(roots.toplevel, ".env");
  let envCopied = false;
  if (!existsSync(envPath)) {
    const rootEnv = join(roots.mainRoot, ".env");
    if (roots.isWorktree && existsSync(rootEnv)) {
      copyFileSync(rootEnv, envPath);
      envCopied = true;
    }
  }
  const envPresent = existsSync(envPath);
  if (!envPresent) {
    return {
      ok: false,
      toplevel: roots.toplevel,
      mainRoot: roots.mainRoot,
      isWorktree: roots.isWorktree,
      envPresent: false,
      envCopied: false,
      database: null,
      smokeAllowed: false,
      smokeReason: "No hay `.env`.",
      error: `Falta .env en ${roots.toplevel} y no hay uno que copiar desde ${roots.mainRoot}. Copia .env.example a .env y complétalo.`,
    };
  }

  const fileEnv = parseEnvFile(readFileSync(envPath, "utf8"));
  // Un DATABASE_URL del entorno manda sobre el del archivo, igual que con `tsx --env-file`.
  const databaseUrl = process.env.DATABASE_URL ?? fileEnv.DATABASE_URL;
  const allowed = (process.env.VERIFY_ALLOWED_DB ?? fileEnv.VERIFY_ALLOWED_DB ?? "").split(",").filter(Boolean);
  const verdict = judgeSmokeDb(databaseUrl, allowed);
  return {
    ok: true,
    toplevel: roots.toplevel,
    mainRoot: roots.mainRoot,
    isWorktree: roots.isWorktree,
    envPresent,
    envCopied,
    database: verdict.database,
    smokeAllowed: verdict.allowed,
    smokeReason: verdict.reason,
  };
}

if (process.argv[1] && /preflight\.ts$/.test(process.argv[1].replace(/\\/g, "/"))) {
  const report = runPreflight();
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    console.error(report.error);
    process.exit(1);
  }
}
