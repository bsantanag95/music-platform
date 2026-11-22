// Lógica pura del hook `Stop` del proyecto (sin I/O): qué cuenta como "cambio de código", cuándo
// correr los checks, cómo resumir su salida y cuándo bloquear o escalar a una persona.

export const MAX_FAILED_ROUNDS = 3;

export interface StopState {
  /** Rondas consecutivas en que los checks fallaron en esta sesión. */
  failedRounds: number;
  /** Huella del último árbol que pasó los checks; evita repetirlos si nada cambió. */
  lastOkFingerprint: string | null;
}

export interface CheckResult {
  name: string;
  command: string;
  ok: boolean;
  output: string;
}

export const INITIAL_STOP_STATE: StopState = { failedRounds: 0, lastOkFingerprint: null };

const CODE_EXT = /\.(ts|tsx|mts|cts|mjs|cjs|js|jsx|json|css|sql)$/;
const NON_CODE_DIR = /^(openspec|docs|\.claude|\.verify|\.git|node_modules|\.next)\//;
const ROOT_CODE_FILES = new Set(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]);

/** ¿Esta ruta (relativa a la raíz, con `/`) cuenta como código que debe verificarse? */
export function isCodePath(path: string): boolean {
  const p = path.replace(/\\/g, "/");
  if (NON_CODE_DIR.test(p)) return false;
  if (ROOT_CODE_FILES.has(p)) return true;
  return CODE_EXT.test(p);
}

/** Extrae las rutas de la salida de `git status --porcelain` (incluye renombrados y sin seguimiento). */
export function pathsFromPorcelain(porcelain: string): string[] {
  const paths: string[] = [];
  for (const line of porcelain.split(/\r?\n/)) {
    if (line.length < 4) continue;
    let rest = line.slice(3);
    const arrow = rest.indexOf(" -> ");
    if (arrow >= 0) rest = rest.slice(arrow + 4);
    rest = rest.trim().replace(/^"(.*)"$/, "$1");
    if (rest) paths.push(rest);
  }
  return paths;
}

export function hasCodeChanges(porcelain: string): boolean {
  return pathsFromPorcelain(porcelain).some(isCodePath);
}

/** ¿Hay que correr los checks? No si no hay código modificado o si ya pasaron sobre este mismo árbol. */
export function shouldRunChecks(state: StopState, codeChanged: boolean, fingerprint: string): boolean {
  if (!codeChanged) return false;
  return state.lastOkFingerprint !== fingerprint;
}

/** Resume la salida de un check: prioriza las líneas de error y limita el tamaño. */
export function summarizeOutput(output: string, maxLines = 30, maxChars = 3000): string {
  const lines = output.split(/\r?\n/).map((l) => l.trimEnd());
  const errorLines = lines.filter((l) => /error|✖|✗|problem|failed|fail /i.test(l));
  const picked = (errorLines.length > 0 ? errorLines : lines.filter((l) => l.length > 0).slice(-maxLines)).slice(
    0,
    maxLines,
  );
  const extra = errorLines.length > maxLines ? `\n… y ${errorLines.length - maxLines} líneas más` : "";
  const text = picked.join("\n") + extra;
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n… (recortado)` : text;
}

export type StopDecision =
  | { action: "pass"; state: StopState }
  | { action: "block"; state: StopState; message: string }
  | { action: "escalate"; state: StopState; message: string };

function describeFailures(failed: CheckResult[]): string {
  return failed.map((r) => `── ${r.name} (\`${r.command}\`) ──\n${summarizeOutput(r.output)}`).join("\n\n");
}

/** Decide qué hacer tras correr los checks. Un éxito reinicia el contador; la ronda 3 escala a una persona. */
export function decideAfterChecks(state: StopState, fingerprint: string, results: CheckResult[]): StopDecision {
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    return { action: "pass", state: { failedRounds: 0, lastOkFingerprint: fingerprint } };
  }
  const failedRounds = state.failedRounds + 1;
  const nextState: StopState = { failedRounds, lastOkFingerprint: null };
  const details = describeFailures(failed);
  if (failedRounds >= MAX_FAILED_ROUNDS) {
    const commands = failed.map((r) => `\`${r.command}\``).join(", ");
    return {
      action: "escalate",
      state: nextState,
      message:
        `Los checks siguen fallando tras ${failedRounds} rondas: necesito ayuda humana. ` +
        `Falla ${commands}; no pude resolverlo solo.\n\n${details}`,
    };
  }
  return {
    action: "block",
    state: nextState,
    message:
      `Verificación fallida (ronda ${failedRounds} de ${MAX_FAILED_ROUNDS}). ` +
      `Corrige antes de terminar:\n\n${details}`,
  };
}
