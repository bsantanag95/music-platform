// @vitest-environment node
import { describe, expect, it } from "vitest";
import { lineKinds, lineupTimeline, type TimelineMember } from "./lineup-timeline";

const member = (id: string, lines: TimelineMember["lines"]): TimelineMember => ({ artistId: id, name: id, lines });
const p = (beginDate: string | null, endDate: string | null, ended = endDate !== null) => ({ beginDate, endDate, ended });
const maiden = { lifeBegin: "1975-12-25", lifeEnd: null, lifeEnded: false };

describe("lineupTimeline", () => {
  it("actuales primero, antiguos por año de entrada; voz e instrumentos; abierto hasta hoy", () => {
    const data = lineupTimeline(
      {
        current: [member("Steve Harris", [{ instruments: ["bass guitar"], periods: [p("1975", null)] }])],
        past: [
          member("Blaze Bayley", [{ instruments: ["lead vocals"], periods: [p("1994", "1999")] }]),
          member("Paul Di'Anno", [{ instruments: ["lead vocals"], periods: [p("1978", "1981")] }]),
        ],
      },
      maiden,
      2026,
    )!;
    expect(data.rows.map((r) => r.name)).toEqual(["Steve Harris", "Paul Di'Anno", "Blaze Bayley"]);
    expect(data.rows[0]!.segments).toEqual([{ from: 1975, to: 2026, kind: "instrument", openStart: false, openEnd: false }]);
    expect(data.rows[1]!.segments[0]!.kind).toBe("voice");
    expect(data).toMatchObject({ from: 1975, to: 2026, present: true });
    expect(data.ticks).toEqual([1975, 1980, 1990, 2000, 2010, 2020]);
  });

  it("no inventa fechas: sin inicio arranca en la formación, terminado sin fin dura un año marcado", () => {
    const data = lineupTimeline(
      {
        current: [member("A", [{ instruments: ["drums"], periods: [p(null, "1980")] }])],
        past: [
          member("B", [{ instruments: ["guitar"], periods: [p("1978", null, true)] }]),
          member("C", [{ instruments: ["guitar"], periods: [p(null, null, true)] }]),
        ],
      },
      maiden,
      2026,
    )!;
    expect(data.rows.map((r) => r.name)).toEqual(["A", "B"]);
    expect(data.rows[0]!.segments[0]).toMatchObject({ from: 1975, to: 1980, openStart: true });
    expect(data.rows[1]!.segments[0]).toMatchObject({ from: 1978, to: 1979, openEnd: true });
  });

  it("con menos de dos integrantes fechados no hay línea de tiempo", () => {
    expect(
      lineupTimeline(
        { current: [member("A", [{ instruments: ["drums"], periods: [p("1990", null)] }])], past: [member("B", [{ instruments: [], periods: [p(null, null)] }])] },
        maiden,
        2026,
      ),
    ).toBeNull();
  });

  it("grupo separado: el eje termina en la separación y los abiertos también", () => {
    const data = lineupTimeline(
      {
        current: [member("A", [{ instruments: ["guitar"], periods: [p("1965", null)] }]), member("B", [{ instruments: ["vocals"], periods: [p("1968", null)] }])],
        past: [],
      },
      { lifeBegin: "1965", lifeEnd: "2014", lifeEnded: true },
      2026,
    )!;
    expect(data).toMatchObject({ from: 1965, to: 2014, present: false });
    expect(data.rows[1]!.segments[0]!.to).toBe(2014);
  });
});

describe("lineKinds", () => {
  it("voz sola, instrumento solo, o ambos cuando el instrumentista hace coros", () => {
    expect(lineKinds(["lead vocals"])).toEqual(["voice"]);
    expect(lineKinds(["drums"])).toEqual(["instrument"]);
    expect(lineKinds(["backing vocals", "bass guitar", "keyboard"])).toEqual(["instrument", "voice"]);
    expect(lineKinds([])).toEqual(["instrument"]);
  });
});
