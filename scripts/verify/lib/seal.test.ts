// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  MAX_CONSECUTIVE_BLOCKS,
  buildSealLine,
  decideGate,
  isExemptMessage,
  parseGateMode,
  parseSeal,
} from "./seal";

describe("parseGateMode", () => {
  it("usa observe por defecto y acepta off/enforce", () => {
    expect(parseGateMode(undefined)).toBe("observe");
    expect(parseGateMode("")).toBe("observe");
    expect(parseGateMode("raro")).toBe("observe");
    expect(parseGateMode("OFF")).toBe("off");
    expect(parseGateMode("enforce")).toBe("enforce");
  });
});

describe("parseSeal", () => {
  it("lee los pasos del trailer", () => {
    const s = parseSeal("feat: x\n\nCuerpo\n\nVerified: typecheck, lint,test ,smoke:routes\nCo-Authored-By: a <b@c>");
    expect(s).toEqual({ present: true, steps: ["typecheck", "lint", "test", "smoke:routes"], none: false, reason: null });
  });
  it("distingue none, none con motivo y ausencia", () => {
    expect(parseSeal("x\n\nVerified: none")).toMatchObject({ present: true, none: true, reason: null });
    expect(parseSeal("x\n\nVerified: none: solo docs")).toMatchObject({ none: true, reason: "solo docs" });
    expect(parseSeal("x\n\nsin trailer")).toMatchObject({ present: false });
  });
  it("toma el último trailer", () => {
    expect(parseSeal("Verified: none\nVerified: lint").steps).toEqual(["lint"]);
  });
});

describe("isExemptMessage", () => {
  it("exime merges, reverts y fixups generados por git", () => {
    expect(isExemptMessage("Merge branch 'x'")).toBe(true);
    expect(isExemptMessage('Revert "feat: x"')).toBe(true);
    expect(isExemptMessage("fixup! feat: x")).toBe(true);
    expect(isExemptMessage("feat: merge things")).toBe(false);
  });
});

describe("decideGate", () => {
  const unsealed = parseSeal("feat: x");
  const sealed = parseSeal("feat: x\n\nVerified: lint,test");

  it("off no hace nada", () => {
    expect(decideGate({ mode: "off", seal: unsealed, exempt: false, consecutiveBlocks: 0 }).verdict).toBe("ok");
  });
  it("observe registra lo que habría bloqueado y no bloquea", () => {
    const d = decideGate({ mode: "observe", seal: unsealed, exempt: false, consecutiveBlocks: 0 });
    expect(d.verdict).toBe("would-block");
    expect(d.exitCode).toBe(0);
  });
  it("observe también marca el sello none sin motivo", () => {
    const d = decideGate({ mode: "observe", seal: parseSeal("x\n\nVerified: none"), exempt: false, consecutiveBlocks: 0 });
    expect(d.verdict).toBe("would-block");
  });
  it("enforce bloquea sin sello y cuenta los bloqueos", () => {
    const d = decideGate({ mode: "enforce", seal: unsealed, exempt: false, consecutiveBlocks: 0 });
    expect(d).toMatchObject({ verdict: "block", exitCode: 1, nextConsecutiveBlocks: 1 });
  });
  it("enforce deja pasar el tercer commit tras dos bloqueos (válvula de escape)", () => {
    const d = decideGate({ mode: "enforce", seal: unsealed, exempt: false, consecutiveBlocks: MAX_CONSECUTIVE_BLOCKS });
    expect(d).toMatchObject({ verdict: "escape", exitCode: 0, nextConsecutiveBlocks: 0 });
  });
  it("enforce acepta un commit sellado y reinicia el contador", () => {
    const d = decideGate({ mode: "enforce", seal: sealed, exempt: false, consecutiveBlocks: 2 });
    expect(d).toMatchObject({ verdict: "ok", exitCode: 0, nextConsecutiveBlocks: 0 });
  });
  it("enforce acepta none con motivo explicado", () => {
    const d = decideGate({
      mode: "enforce",
      seal: parseSeal("x\n\nVerified: none: solo docs"),
      exempt: false,
      consecutiveBlocks: 0,
    });
    expect(d.verdict).toBe("ok");
  });
  it("los mensajes exentos no se evalúan", () => {
    expect(decideGate({ mode: "enforce", seal: unsealed, exempt: true, consecutiveBlocks: 0 }).verdict).toBe("exempt");
  });
});

describe("buildSealLine", () => {
  it("arma el trailer o none", () => {
    expect(buildSealLine(["typecheck", "lint"])).toBe("Verified: typecheck,lint");
    expect(buildSealLine([])).toBe("Verified: none");
  });
});
