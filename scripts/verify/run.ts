// `pnpm run verify` (task 1.4): precondiciones + checks baratos, y deja constancia de lo que pasó para
// poder sellar el commit. Falla rápido (primero lo barato).
//
//   pnpm run verify                         preflight, review, typecheck, lint, test:related (solo tests del diff)
//   pnpm run verify -- --full               en vez de test:related, la suite completa (`test`) y además `build`
//   pnpm run verify -- --smoke a,b          además los smoke tests `a` y `b` (scripts/smoke-test-<x>.ts), solo si la BD es de scratch
//
// Escribe `.verify/last-run.json` con la huella del árbol; `seal.ts --suggest` la usa para proponer el trailer.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { codeFingerprint, collectChanges } from "./lib/git";
import { isCodePath } from "./lib/stop-logic";
import { runPreflight } from "./preflight";
import { runReview } from "./review-triggers";

export interface RunStep {
  name: string;
  ok: boolean;
  skipped?: string;
  ms: number;
}

function sh(command: string, cwd: string, extraEnv: Record<string, string> = {}): boolean {
  const r = spawnSync(command, { cwd, shell: true, stdio: "inherit", env: { ...process.env, ...extraEnv } });
  return r.status === 0;
}

const MAX_RELATED_FILES = 150;

/**
 * Comando de vitest que corre solo los tests que importan (directa o transitivamente) los archivos de código
 * cambiados respecto de `main`. Si el diff es enorme, pasa a la suite completa (la línea de comandos tiene límite).
 */
function relatedTestCommand(cwd: string): string | null {
  const files = collectChanges("main", cwd)
    .filter((c) => c.kind !== "D" && isCodePath(c.path))
    .map((c) => c.path);
  if (files.length === 0) return null;
  if (files.length > MAX_RELATED_FILES) return "pnpm run test";
  return `pnpm exec vitest related --run --passWithNoTests ${files.map((f) => JSON.stringify(f)).join(" ")}`;
}

function timed(name: string, fn: () => boolean | { ok: boolean; skipped: string }): RunStep {
  const t0 = Date.now();
  const r = fn();
  const ms = Date.now() - t0;
  return typeof r === "boolean" ? { name, ok: r, ms } : { name, ok: false, skipped: r.skipped, ms };
}

function main(): number {
  const args = process.argv.slice(2);
  const full = args.includes("--full");
  const smokeIdx = args.indexOf("--smoke");
  const smokes = smokeIdx >= 0 ? (args[smokeIdx + 1] ?? "").split(",").filter(Boolean) : [];

  const pre = runPreflight();
  console.log(`[verify] worktree=${pre.isWorktree} env=${pre.envPresent}${pre.envCopied ? " (copiado)" : ""} bd=${pre.database ?? "?"}`);
  if (!pre.ok) {
    console.error(`[verify] ${pre.error}`);
    return 1;
  }
  const cwd = pre.toplevel;
  const steps: RunStep[] = [];

  const stages: Array<[string, () => boolean]> = [
    ["review", () => {
      const r = runReview(cwd);
      console.log(r.text);
      return !r.failed;
    }],
    ["typecheck", () => sh("pnpm run typecheck", cwd)],
    ["lint", () => sh("pnpm run lint", cwd)],
  ];
  if (full) {
    // La suite completa tarda ~19 min en esta máquina: solo con --full (y en el CI).
    stages.push(["test", () => sh("pnpm run test", cwd)]);
    stages.push(["build", () => sh("pnpm run build", cwd)]);
  } else {
    stages.push([
      "test:related",
      () => {
        const command = relatedTestCommand(cwd);
        if (command === null) {
          console.log("[verify] Sin código modificado: no hay tests relacionados que correr.");
          return true;
        }
        return sh(command, cwd);
      },
    ]);
  }

  let failed = false;
  for (const [name, fn] of stages) {
    const step = timed(name, fn);
    steps.push(step);
    console.log(`[verify] ${step.ok ? "OK " : "FALLA"} ${name} (${step.ms} ms)`);
    if (!step.ok) {
      failed = true;
      break;
    }
  }

  if (!failed) {
    for (const name of smokes) {
      const label = `smoke:${name}`;
      if (!pre.smokeAllowed) {
        console.log(`[verify] OMITIDO ${label}: ${pre.smokeReason}`);
        steps.push({ name: label, ok: false, skipped: pre.smokeReason, ms: 0 });
        continue;
      }
      const step = timed(label, () =>
        sh(`npx tsx --env-file=.env scripts/smoke-test-${name}.ts`, cwd, { ALLOW_SMOKE_ON_REAL_DB: "1" }),
      );
      steps.push(step);
      console.log(`[verify] ${step.ok ? "OK " : "FALLA"} ${label} (${step.ms} ms)`);
      if (!step.ok) {
        failed = true;
        break;
      }
    }
  }

  mkdirSync(join(cwd, ".verify"), { recursive: true });
  writeFileSync(
    join(cwd, ".verify", "last-run.json"),
    JSON.stringify({ at: new Date().toISOString(), fingerprint: codeFingerprint(cwd), steps }, null, 2),
  );
  const passed = steps.filter((s) => s.ok).map((s) => s.name);
  console.log(`[verify] ${failed ? "FALLÓ" : "Listo"}. Pasaron: ${passed.join(", ") || "ninguno"}`);
  return failed ? 1 : 0;
}

if (process.argv[1] && /run\.ts$/.test(process.argv[1].replace(/\\/g, "/"))) {
  process.exit(main());
}
