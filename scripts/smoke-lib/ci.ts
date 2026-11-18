// `pnpm run smoke:ci`: corre en orden los smoke tests de `ci-list.ts` contra la BD de `DATABASE_URL` y resume el resultado.
//
//   pnpm run smoke:ci                     toda la lista
//   pnpm run smoke:ci -- --only a,b       solo esos (sin garantía de datos previos: `routes` necesita `ingestion`)
//
// Habilita `ALLOW_SMOKE_ON_REAL_DB=1` SOLO para sus hijos y solo si el nombre de la BD es de scratch (misma regla que
// `pnpm run verify`; en el CI la BD es el servicio efímero `music_platform_ci`). Sin `--env-file`: usa el entorno tal cual.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { judgeSmokeDb } from "../verify/lib/env";
import { CI_SMOKES } from "./ci-list";

interface Result {
  name: string;
  ok: boolean;
  seconds: number;
}

function main(): number {
  const allowed = (process.env.VERIFY_ALLOWED_DB ?? "").split(",").filter(Boolean);
  const verdict = judgeSmokeDb(process.env.DATABASE_URL, allowed);
  if (!verdict.allowed) {
    console.error(`⛔ smoke:ci abortado: ${verdict.reason}`);
    return 1;
  }

  const onlyIdx = process.argv.indexOf("--only");
  const only = onlyIdx >= 0 ? (process.argv[onlyIdx + 1] ?? "").split(",").filter(Boolean) : null;
  const names = only ?? [...CI_SMOKES];
  const inGitHub = process.env.GITHUB_ACTIONS === "true";
  const results: Result[] = [];

  for (const name of names) {
    const file = join("scripts", `smoke-test-${name}.ts`);
    if (!existsSync(file)) {
      console.error(`❌ ${name}: no existe ${file}`);
      results.push({ name, ok: false, seconds: 0 });
      continue;
    }
    if (inGitHub) console.log(`::group::${name}`);
    const t0 = Date.now();
    const r = spawnSync(process.execPath, ["--import", "tsx", file], {
      stdio: "inherit",
      env: { ...process.env, ALLOW_SMOKE_ON_REAL_DB: "1" },
    });
    const seconds = Math.round((Date.now() - t0) / 1000);
    if (inGitHub) console.log("::endgroup::");
    const ok = r.status === 0;
    if (!ok) console.error(`${inGitHub ? "::error::" : ""}❌ ${name} falló (código ${r.status ?? "señal " + r.signal})`);
    results.push({ name, ok, seconds });
  }

  console.log("\n── Resumen de smoke tests ──");
  for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.name.padEnd(24)} ${r.seconds}s`);
  const failed = results.filter((r) => !r.ok);
  console.log(`${results.length - failed.length} de ${results.length} pasaron.`);
  return failed.length === 0 ? 0 : 1;
}

process.exit(main());
