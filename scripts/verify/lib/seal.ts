// Lógica pura del sello de verificación (`Verified:`) y del gate de commit. Sin I/O.
//
// Formato del trailer en el mensaje del commit:
//   Verified: typecheck,lint,test,build,smoke:<nombre>,e2e
//   Verified: none
//   Verified: none: motivo por el que no se verificó      (cuenta como explicado en modo enforce)

export type GateMode = "off" | "observe" | "enforce";

/** Bloqueos consecutivos tras los cuales el siguiente commit pasa (válvula de escape). */
export const MAX_CONSECUTIVE_BLOCKS = 2;

export function parseGateMode(value: string | undefined): GateMode {
  const v = (value ?? "").trim().toLowerCase();
  return v === "off" || v === "enforce" ? v : "observe";
}

export interface Seal {
  present: boolean;
  /** Pasos verificados; vacío si falta el sello o es `none`. */
  steps: string[];
  none: boolean;
  /** Motivo declarado cuando el sello es `none: motivo`. */
  reason: string | null;
}

export function parseSeal(message: string): Seal {
  const matches = [...message.matchAll(/^Verified:[ \t]*(.*)$/gim)];
  const last = matches[matches.length - 1];
  if (!last) return { present: false, steps: [], none: false, reason: null };
  const value = (last[1] ?? "").trim();
  const none = /^none\b/i.test(value) || value === "";
  if (none) {
    const reason = value.replace(/^none\b[\s:–—-]*/i, "").trim();
    return { present: true, steps: [], none: true, reason: reason || null };
  }
  return {
    present: true,
    steps: value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    none: false,
    reason: null,
  };
}

/** Mensajes generados por git que no representan trabajo propio: no se sellan. */
export function isExemptMessage(message: string): boolean {
  const first = message.split(/\r?\n/)[0] ?? "";
  return /^(Merge |Revert "|fixup! |squash! |amend! )/.test(first);
}

export type GateVerdict = "ok" | "exempt" | "would-block" | "block" | "escape";

export interface GateDecision {
  verdict: GateVerdict;
  /** Código de salida del hook `commit-msg`. */
  exitCode: 0 | 1;
  message: string | null;
  nextConsecutiveBlocks: number;
}

export function isVerified(seal: Seal): boolean {
  return seal.present && !seal.none && seal.steps.length > 0;
}

export function decideGate(input: {
  mode: GateMode;
  seal: Seal;
  exempt: boolean;
  consecutiveBlocks: number;
}): GateDecision {
  const { mode, seal, exempt, consecutiveBlocks } = input;
  if (mode === "off") return { verdict: "ok", exitCode: 0, message: null, nextConsecutiveBlocks: consecutiveBlocks };
  if (exempt) return { verdict: "exempt", exitCode: 0, message: null, nextConsecutiveBlocks: consecutiveBlocks };
  // Verificado, o sin verificar pero con el motivo explicado en el propio mensaje.
  if (isVerified(seal) || (seal.none && seal.reason)) {
    return { verdict: "ok", exitCode: 0, message: null, nextConsecutiveBlocks: 0 };
  }
  const why = seal.present
    ? "el sello es `none` sin motivo"
    : "falta el trailer `Verified:`";
  if (mode === "observe") {
    return {
      verdict: "would-block",
      exitCode: 0,
      message: `[verify] Modo observe: habría bloqueado este commit (${why}).`,
      nextConsecutiveBlocks: consecutiveBlocks,
    };
  }
  if (consecutiveBlocks >= MAX_CONSECUTIVE_BLOCKS) {
    return {
      verdict: "escape",
      exitCode: 0,
      message: `[verify] Se permite este commit sin sello (válvula de escape tras ${MAX_CONSECUTIVE_BLOCKS} bloqueos seguidos).`,
      nextConsecutiveBlocks: 0,
    };
  }
  return {
    verdict: "block",
    exitCode: 1,
    message:
      `[verify] Commit bloqueado: ${why}. Corre \`pnpm run verify\` y agrega el trailer ` +
      "`Verified: …` (ver `node --import tsx scripts/verify/seal.ts --suggest`), o `Verified: none: <motivo>`.",
    nextConsecutiveBlocks: consecutiveBlocks + 1,
  };
}

/** Línea de sello a partir de los pasos que pasaron en la última corrida sobre este mismo árbol. */
export function buildSealLine(steps: string[]): string {
  return steps.length > 0 ? `Verified: ${steps.join(",")}` : "Verified: none";
}
