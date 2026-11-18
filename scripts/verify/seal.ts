// Sello de verificación y gate de commit (tasks 3.3–3.5).
//
//   seal.ts --hook <archivo-mensaje>   lo invoca `.githooks/commit-msg`; aplica el gate según VERIFY_GATE
//   seal.ts --suggest                  imprime el trailer `Verified: …` según la última corrida de `verify`
//   seal.ts --report [rango]           lista los commits sin sello o con `none` (por defecto: <main>..HEAD)
//
// VERIFY_GATE=off|observe|enforce (por defecto observe). En observe solo registra en `.verify/log.jsonl`
// lo que habría bloqueado. En enforce bloquea, salvo tras 2 bloqueos seguidos (válvula de escape).

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { codeFingerprint, git, repoRoots } from "./lib/git";
import { buildSealLine, decideGate, isExemptMessage, parseGateMode, parseSeal, isVerified } from "./lib/seal";

function verifyDir(cwd: string): string {
  const dir = join(cwd, ".verify");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function hook(messageFile: string): number {
  const mode = parseGateMode(process.env.VERIFY_GATE);
  if (mode === "off") return 0;
  const message = readFileSync(messageFile, "utf8");
  const cwd = repoRoots(process.cwd()).toplevel;
  const dir = verifyDir(cwd);
  const stateFile = join(dir, "gate-state.json");
  const state = readJson<{ consecutiveBlocks: number }>(stateFile) ?? { consecutiveBlocks: 0 };

  const seal = parseSeal(message);
  const decision = decideGate({
    mode,
    seal,
    exempt: isExemptMessage(message),
    consecutiveBlocks: state.consecutiveBlocks,
  });

  writeFileSync(stateFile, JSON.stringify({ consecutiveBlocks: decision.nextConsecutiveBlocks }));
  appendFileSync(
    join(dir, "log.jsonl"),
    `${JSON.stringify({
      at: new Date().toISOString(),
      mode,
      verdict: decision.verdict,
      subject: message.split(/\r?\n/)[0],
      seal: seal.present ? (seal.none ? `none${seal.reason ? `: ${seal.reason}` : ""}` : seal.steps.join(",")) : null,
    })}\n`,
  );
  if (decision.message) console.error(decision.message);
  return decision.exitCode;
}

function suggest(): number {
  const cwd = repoRoots(process.cwd()).toplevel;
  const last = readJson<{ fingerprint: string; steps: Array<{ name: string; ok: boolean }> }>(
    join(cwd, ".verify", "last-run.json"),
  );
  if (!last) {
    console.log("Verified: none");
    console.error("[verify] No hay una corrida previa: ejecuta `pnpm run verify`.");
    return 0;
  }
  if (last.fingerprint !== codeFingerprint(cwd)) {
    console.log("Verified: none");
    console.error("[verify] El árbol cambió desde la última corrida de `verify`: vuelve a correrla para sellar.");
    return 0;
  }
  const passed = last.steps.filter((s) => s.ok).map((s) => s.name);
  console.log(buildSealLine(passed));
  return 0;
}

function report(range?: string): number {
  const cwd = repoRoots(process.cwd()).toplevel;
  const log = git(["log", "--format=%h%x1f%s%x1f%(trailers:key=Verified,valueonly,separator=%x2C)", range ?? "main..HEAD"], cwd);
  const unverified: string[] = [];
  let total = 0;
  for (const line of log.split(/\r?\n/).filter(Boolean)) {
    const [hash, subject, trailer] = line.split("\x1f");
    total++;
    const seal = parseSeal(trailer ? `Verified: ${trailer.trim()}` : "");
    if (!isVerified(seal)) unverified.push(`${hash} ${subject}${seal.present ? " (none)" : " (sin sello)"}`);
  }
  console.log(`${unverified.length} de ${total} commits sin verificar:`);
  for (const l of unverified) console.log(`  ${l}`);
  return 0;
}

const args = process.argv.slice(2);
if (process.argv[1] && /seal\.ts$/.test(process.argv[1].replace(/\\/g, "/"))) {
  if (args[0] === "--hook" && args[1]) process.exit(hook(args[1]));
  else if (args[0] === "--suggest") process.exit(suggest());
  else if (args[0] === "--report") process.exit(report(args[1]));
  else {
    console.error("Uso: seal.ts --hook <archivo> | --suggest | --report [rango]");
    process.exit(2);
  }
}
