// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import { composeTop, currentYearIn, parseYear, prefillTop, type YearDiscChoice } from "./year";
import { parseYearRef, yearCoverIds, yearRef } from "../share/targets/year";

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

const choice = (id: string, listens: number, score: YearDiscChoice["score"] = null): YearDiscChoice => ({
  id,
  title: id,
  artistName: null,
  coverThumbUrl: null,
  listens,
  score,
});

describe("Top 5 del año", () => {
  const choices = [
    choice("muchas-sin-nota", 30),
    choice("ochenta", 10, { stars: 4, detailedScore: 80 }),
    choice("noventa-y-cinco", 1, { stars: 5, detailedScore: 95 }),
    choice("cuatro-y-media", 2, { stars: 4.5, detailedScore: null }),
    choice("ochenta-mas-escuchado", 12, { stars: 4, detailedScore: 80 }),
    choice("pocas-sin-nota", 3),
    choice("nada", 1),
  ];

  it("prellena por nota, a igual nota por escuchas, y completa con los más escuchados sin nota", () => {
    expect(prefillTop(choices).map((disc) => disc.id)).toEqual(["noventa-y-cinco", "cuatro-y-media", "ochenta-mas-escuchado", "ochenta", "muchas-sin-nota"]);
  });

  it("no expone las notas", () => {
    expect(prefillTop(choices).every((disc) => !("score" in disc))).toBe(true);
  });

  it("sin elección es el prellenado", () => {
    expect(composeTop(choices, [])).toEqual({ discs: prefillTop(choices), custom: false });
  });

  it("lo elegido va en su orden; lo que dejó de valer sale y se completa con el prellenado", () => {
    const top = composeTop(choices, ["nada", "ya-no-escuchado", "pocas-sin-nota"]);
    expect(top.custom).toBe(true);
    expect(top.discs.map((disc) => disc.id)).toEqual(["nada", "pocas-sin-nota", "noventa-y-cinco", "cuatro-y-media", "ochenta-mas-escuchado"]);
  });
});

describe("carátulas de la imagen del año", () => {
  const disc = (id: string, listens = 1) => ({ id, listens });

  it("primero el Top 5, después los meses con más escuchas, hasta 10 distintas", () => {
    const top = ["t1", "t2", "t3", "t4", "t5"].map((id) => disc(id));
    const months = Array.from({ length: 12 }, (_, i) => ({ discs: [disc(`m${i}`, i + 1), disc(`otro${i}`, 1)] }));
    const ids = yearCoverIds(top, months);
    expect(ids.size).toBe(10);
    expect(["t1", "t2", "t3", "t4", "t5", "m11", "m10", "m9", "m8", "m7"].every((id) => ids.has(id))).toBe(true);
    expect(ids.has("m0")).toBe(false);
  });

  it("un disco del Top 5 que también encabeza un mes no gasta otra carátula", () => {
    const ids = yearCoverIds([disc("a")], [{ discs: [disc("a", 9)] }, { discs: [disc("b", 2)] }]);
    expect([...ids]).toEqual(["a", "b"]);
  });
});
