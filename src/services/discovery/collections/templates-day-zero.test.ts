import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import { GENRE_FAMILIES } from "@/services/genres/families";
import { familiesFromWeek } from "./templates-day-zero";
import { weekNumber } from "./periods";

describe("familiesFromWeek", () => {
  it("contiene todas las familias, rotadas, sin repetir", () => {
    const families = familiesFromWeek(new Date("2026-10-12T00:00:00Z"));
    expect([...families].sort()).toEqual(GENRE_FAMILIES.map((f) => f.key).sort());
  });

  it("la primera es la (semana mod n)-ésima en el orden de la taxonomía", () => {
    const now = new Date("2026-10-12T00:00:00Z");
    expect(familiesFromWeek(now)[0]).toBe(GENRE_FAMILIES[weekNumber(now) % GENRE_FAMILIES.length]!.key);
  });

  it("cambia de familia de una semana a la siguiente y no dentro de la misma", () => {
    const monday = familiesFromWeek(new Date("2026-10-12T00:00:00Z"))[0];
    expect(familiesFromWeek(new Date("2026-10-18T23:59:59Z"))[0]).toBe(monday);
    expect(familiesFromWeek(new Date("2026-10-19T00:00:00Z"))[0]).not.toBe(monday);
  });

  it("recorre todas las familias en tantas semanas como familias hay", () => {
    const seen = new Set<string>();
    for (let week = 0; week < GENRE_FAMILIES.length; week += 1) {
      seen.add(familiesFromWeek(new Date(Date.UTC(2026, 9, 12 + week * 7)))[0]!);
    }
    expect(seen.size).toBe(GENRE_FAMILIES.length);
  });
});
