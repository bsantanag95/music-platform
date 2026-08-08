import { describe, it, expect } from "vitest";
import { isValidUuid } from "./validation";

describe("isValidUuid", () => {
  it("acepta un UUID válido en minúsculas", () => {
    expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("acepta un UUID válido en mayúsculas", () => {
    expect(isValidUuid("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rechaza un UUID con caracteres extra al final", () => {
    expect(isValidUuid("550e8400-e29b-41d4-a716-446655440000a")).toBe(false);
  });

  it("rechaza un UUID con caracteres extra al inicio", () => {
    expect(isValidUuid("a550e8400-e29b-41d4-a716-446655440000")).toBe(false);
  });

  it("rechaza un string vacío", () => {
    expect(isValidUuid("")).toBe(false);
  });

  it("rechaza un string sin formato UUID", () => {
    expect(isValidUuid("not-a-uuid")).toBe(false);
  });

  it("rechaza un UUID con guiones en posiciones incorrectas", () => {
    expect(isValidUuid("550e8400e29b-41d4-a716-446655440000")).toBe(false);
  });
});
