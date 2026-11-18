// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  INITIAL_STOP_STATE,
  MAX_FAILED_ROUNDS,
  decideAfterChecks,
  hasCodeChanges,
  isCodePath,
  pathsFromPorcelain,
  shouldRunChecks,
  summarizeOutput,
  type CheckResult,
} from "./stop-logic";

const ok = (name: string): CheckResult => ({ name, command: `pnpm run ${name}`, ok: true, output: "" });
const bad = (name: string, output = "src/a.ts(1,1): error TS2322: tipo"): CheckResult => ({
  name,
  command: `pnpm run ${name}`,
  ok: false,
  output,
});

describe("isCodePath / hasCodeChanges", () => {
  it("cuenta código y excluye documentación, openspec y .claude", () => {
    expect(isCodePath("src/app/page.tsx")).toBe(true);
    expect(isCodePath("drizzle/0100_x.sql")).toBe(true);
    expect(isCodePath("messages/es/info.json")).toBe(true);
    expect(isCodePath("package.json")).toBe(true);
    expect(isCodePath("docs/05-features/x.md")).toBe(false);
    expect(isCodePath("openspec/changes/x/tasks.md")).toBe(false);
    expect(isCodePath(".claude/settings.json")).toBe(false);
    expect(isCodePath("README.md")).toBe(false);
  });
  it("lee la salida de git status --porcelain, incluso renombrados", () => {
    const out = " M src/a.ts\n?? docs/x.md\nR  old.ts -> src/new.ts\n";
    expect(pathsFromPorcelain(out)).toEqual(["src/a.ts", "docs/x.md", "src/new.ts"]);
    expect(hasCodeChanges(out)).toBe(true);
    expect(hasCodeChanges("?? docs/x.md\n M openspec/changes/a/tasks.md\n")).toBe(false);
    expect(hasCodeChanges("")).toBe(false);
  });
});

describe("shouldRunChecks", () => {
  it("no corre sin cambios de código", () => {
    expect(shouldRunChecks(INITIAL_STOP_STATE, false, "")).toBe(false);
  });
  it("no repite si ya pasó sobre el mismo árbol", () => {
    expect(shouldRunChecks({ failedRounds: 0, lastOkFingerprint: "abc" }, true, "abc")).toBe(false);
    expect(shouldRunChecks({ failedRounds: 0, lastOkFingerprint: "abc" }, true, "def")).toBe(true);
  });
});

describe("decideAfterChecks", () => {
  it("éxito: pasa y reinicia el contador", () => {
    const d = decideAfterChecks({ failedRounds: 2, lastOkFingerprint: null }, "fp", [ok("typecheck"), ok("lint")]);
    expect(d.action).toBe("pass");
    expect(d.state).toEqual({ failedRounds: 0, lastOkFingerprint: "fp" });
  });
  it("rondas 1 y 2: bloquea con la salida del fallo", () => {
    const r1 = decideAfterChecks(INITIAL_STOP_STATE, "fp", [bad("typecheck"), ok("lint")]);
    expect(r1.action).toBe("block");
    expect(r1.state.failedRounds).toBe(1);
    if (r1.action === "block") expect(r1.message).toContain("TS2322");
    const r2 = decideAfterChecks(r1.state, "fp", [bad("typecheck")]);
    expect(r2.action).toBe("block");
    expect(r2.state.failedRounds).toBe(2);
  });
  it("ronda 3: escala a una persona con el comando que falla y deja de bloquear", () => {
    const d = decideAfterChecks({ failedRounds: MAX_FAILED_ROUNDS - 1, lastOkFingerprint: null }, "fp", [
      ok("typecheck"),
      bad("lint", "src/x.ts\n  1:1  error  no-unused-vars"),
    ]);
    expect(d.action).toBe("escalate");
    if (d.action === "escalate") {
      expect(d.message).toContain("ayuda humana");
      expect(d.message).toContain("pnpm run lint");
      expect(d.message).not.toContain("pnpm run typecheck");
    }
  });
  it("un éxito tras fallos reinicia el contador", () => {
    const fail = decideAfterChecks(INITIAL_STOP_STATE, "a", [bad("lint")]);
    const pass = decideAfterChecks(fail.state, "b", [ok("lint")]);
    expect(pass.state.failedRounds).toBe(0);
  });
});

describe("summarizeOutput", () => {
  it("prioriza líneas de error y limita el tamaño", () => {
    const noisy = Array.from({ length: 200 }, (_, i) => `linea ${i}`).join("\n") + "\nsrc/a.ts: error TS1\n";
    const s = summarizeOutput(noisy, 10);
    expect(s).toContain("error TS1");
    expect(s.split("\n").length).toBeLessThanOrEqual(11);
  });
  it("sin errores devuelve las últimas líneas", () => {
    const s = summarizeOutput(Array.from({ length: 100 }, (_, i) => `l${i}`).join("\n"), 3);
    expect(s).toContain("l99");
    expect(s).not.toContain("l0\n");
  });
});
