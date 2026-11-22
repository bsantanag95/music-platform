// Hook `Stop` del proyecto (tasks 2.1–2.2). Antes de que el agente termine, corre `typecheck` y `lint` si
// hay cambios de código sin verificar.
//
//  - Fallo en las rondas 1–2: sale con código 2 y entrega la salida resumida por stderr (el agente corrige).
//  - Fallo en la ronda 3: deja terminar y emite un `systemMessage` que pide ayuda humana.
//  - Éxito: reinicia el contador. Sin cambios de código, o sin cambios desde el último éxito: no corre nada.
//
// No corre `test` ni `build` (pesados): eso es `pnpm run verify` y el CI. El estado por sesión vive en un
// archivo temporal; cualquier error propio del hook (no del código verificado) deja pasar para no atascar.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { codeFingerprint, porcelain } from "./lib/git";
import {
  INITIAL_STOP_STATE,
  decideAfterChecks,
  hasCodeChanges,
  shouldRunChecks,
  type CheckResult,
  type StopState,
} from "./lib/stop-logic";

const CHECKS = [
  { name: "typecheck", command: "pnpm run typecheck" },
  { name: "lint", command: "pnpm run lint" },
] as const;

const CHECK_TIMEOUT_MS = 4 * 60 * 1000;

function readStdin(): string {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function stateFile(sessionId: string): string {
  const dir = join(tmpdir(), "music-platform-verify");
  mkdirSync(dir, { recursive: true });
  return join(dir, `${sessionId.replace(/[^a-zA-Z0-9_-]/g, "_") || "sin-sesion"}.json`);
}

function loadState(file: string): StopState {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<StopState>;
    return {
      failedRounds: typeof parsed.failedRounds === "number" ? parsed.failedRounds : 0,
      lastOkFingerprint: typeof parsed.lastOkFingerprint === "string" ? parsed.lastOkFingerprint : null,
    };
  } catch {
    return { ...INITIAL_STOP_STATE };
  }
}

function runCheck(name: string, command: string, cwd: string): CheckResult {
  const r = spawnSync(command, { cwd, shell: true, encoding: "utf8", timeout: CHECK_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 });
  const output = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const timedOut = r.error !== undefined && /ETIMEDOUT/.test(String(r.error));
  return { name, command, ok: r.status === 0 && !timedOut, output: timedOut ? `Tiempo agotado (${CHECK_TIMEOUT_MS / 1000}s)\n${output}` : output };
}

function main(): void {
  let input: { session_id?: string; cwd?: string } = {};
  try {
    input = JSON.parse(readStdin() || "{}") as typeof input;
  } catch {
    input = {};
  }
  const cwd = input.cwd || process.cwd();
  const file = stateFile(input.session_id ?? "");
  const state = loadState(file);

  const changed = hasCodeChanges(porcelain(cwd));
  const fingerprint = changed ? codeFingerprint(cwd) : "";
  if (!shouldRunChecks(state, changed, fingerprint)) return;

  const results = CHECKS.map((c) => runCheck(c.name, c.command, cwd));
  const decision = decideAfterChecks(state, fingerprint, results);
  writeFileSync(file, JSON.stringify(decision.state));

  if (decision.action === "block") {
    process.stderr.write(`${decision.message}\n`);
    process.exit(2);
  }
  if (decision.action === "escalate") {
    process.stdout.write(`${JSON.stringify({ systemMessage: decision.message })}\n`);
  }
}

try {
  main();
} catch (error) {
  // Un fallo del propio hook no debe atascar al agente.
  process.stderr.write(`[verify] El hook Stop falló y se omite: ${error instanceof Error ? error.message : String(error)}\n`);
}
