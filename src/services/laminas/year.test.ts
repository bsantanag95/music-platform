// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import { currentYearIn, parseYear } from "./year";
import { parseYearRef, yearRef } from "../share/targets/year";

describe("parseYear", () => {
  it("acepta años de cuatro cifras entre 2000 y 2100", () => {
    expect(parseYear("2026")).toBe(2026);
    expect(parseYear(2000)).toBe(2000);
    expect(parseYear("2100")).toBe(2100);
  });

  it.each(["1999", "2101", "26", "2026a", "", null, undefined, 2026.5])("rechaza %s", (value) => {
    expect(parseYear(value as string)).toBeNull();
  });
});

describe("currentYearIn", () => {
  it("cuenta el año en la zona: el 31 de diciembre a las 22:00 en Santiago es todavía ese año", () => {
    const now = new Date("2027-01-01T01:00:00Z");
    expect(currentYearIn("America/Santiago", now)).toBe(2026);
    expect(currentYearIn("UTC", now)).toBe(2027);
  });
});

describe("referencia del año", () => {
  const user = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";

  it("es el usuario y el año", () => {
    expect(yearRef(user, 2026)).toBe(`${user}.2026`);
    expect(parseYearRef(`${user}.2026`)).toEqual({ userId: user, year: 2026 });
  });

  it.each([`${user}`, `${user}.1999`, `x.2026`, `${user}.2026.1`])("rechaza %s", (ref) => {
    expect(parseYearRef(ref)).toBeNull();
  });
});
