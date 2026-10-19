import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));
vi.mock("@/db", () => ({ db: { execute: mocks.execute } }));

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { GENRE_FAMILIES } from "@/services/genres/families";
import { familiesFromWeek, grammyWinners } from "./templates-day-zero";
import { weekNumber } from "./periods";

describe("grammyWinners", () => {
  it("elige la ceremonia más reciente solo entre premios competitivos: un salón de la fama no es una ceremonia de ganadores", async () => {
    mocks.execute.mockResolvedValue([]);
    const result = await grammyWinners.plan(new Date("2026-10-19T00:00:00Z"), {} as never);
    expect(result).toHaveProperty("skip");
    const text = new PgDialect().sqlToQuery(mocks.execute.mock.calls[0]![0] as SQL).sql;
    expect(text).toContain("a.kind = 'competition'");
    expect(text).toContain("order by c.held_on desc limit 1");
  });
});

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
