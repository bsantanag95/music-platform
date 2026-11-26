import { describe, expect, it } from "vitest";
import { DEFAULT_POOL_MAX, parsePoolMax } from "./pool-config";

describe("parsePoolMax", () => {
  it("sin valor usa 5", () => {
    expect(parsePoolMax(undefined)).toBe(DEFAULT_POOL_MAX);
    expect(parsePoolMax("  ")).toBe(5);
  });

  it("acepta un entero positivo", () => {
    expect(parsePoolMax("20")).toBe(20);
    expect(parsePoolMax(" 8 ")).toBe(8);
  });

  it.each(["0", "-3", "abc", "2.5"])("rechaza %s nombrando la variable", (raw) => {
    expect(() => parsePoolMax(raw)).toThrow(/DATABASE_POOL_MAX/);
  });
});
