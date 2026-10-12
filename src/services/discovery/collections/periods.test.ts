import { describe, expect, it } from "vitest";
import { eraOf, isoWeekKey, monthKey, sampleEvenly, weekNumber } from "./periods";

const at = (iso: string) => new Date(iso);

describe("isoWeekKey", () => {
  it("usa la semana ISO 8601 (lunes a domingo)", () => {
    expect(isoWeekKey(at("2026-10-12T00:00:00Z"))).toBe("2026-W42"); // lunes
    expect(isoWeekKey(at("2026-10-18T23:59:59Z"))).toBe("2026-W42"); // domingo
    expect(isoWeekKey(at("2026-10-19T00:00:00Z"))).toBe("2026-W43");
  });

  it("el año ISO puede diferir del año calendario", () => {
    expect(isoWeekKey(at("2021-01-01T12:00:00Z"))).toBe("2020-W53");
    expect(isoWeekKey(at("2024-12-30T12:00:00Z"))).toBe("2025-W01");
  });
});

describe("weekNumber", () => {
  it("avanza una unidad por semana, de lunes a lunes", () => {
    const monday = weekNumber(at("2026-10-12T00:00:00Z"));
    expect(weekNumber(at("2026-10-18T23:59:59Z"))).toBe(monday);
    expect(weekNumber(at("2026-10-19T00:00:00Z"))).toBe(monday + 1);
  });

  it("no salta al cambiar de año", () => {
    const last = weekNumber(at("2026-12-28T00:00:00Z"));
    expect(weekNumber(at("2027-01-04T00:00:00Z"))).toBe(last + 1);
  });
});

describe("monthKey y eraOf", () => {
  it("monthKey rellena el mes", () => {
    expect(monthKey(at("2026-03-05T00:00:00Z"))).toBe("2026-03");
  });

  it("eraOf agrupa por lustros", () => {
    expect(eraOf(1994, 5)).toBe(1990);
    expect(eraOf(1995, 5)).toBe(1995);
    expect(eraOf(1999, 5)).toBe(1995);
  });
});

describe("sampleEvenly", () => {
  it("devuelve todo si cabe", () => {
    expect(sampleEvenly([1, 2, 3], 5)).toEqual([1, 2, 3]);
  });

  it("reparte parejo y conserva el primero y el último", () => {
    const items = Array.from({ length: 14 }, (_, i) => i);
    const picked = sampleEvenly(items, 12);
    expect(picked).toHaveLength(12);
    expect(picked[0]).toBe(0);
    expect(picked.at(-1)).toBe(13);
    expect(new Set(picked).size).toBe(12);
    expect([...picked].sort((a, b) => a - b)).toEqual(picked);
  });

  it("con max 1 devuelve el primero", () => {
    expect(sampleEvenly([5, 6, 7], 1)).toEqual([5]);
  });
});
