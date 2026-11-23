// @vitest-environment node
// Propiedades de la línea de tiempo de la alineación (openspec: modernize-artist-page-phase2): sea cual sea la alineación,
// ningún tramo sale del eje, cada tramo va hacia adelante, las filas son los integrantes con algún año y nunca se dibuja un
// período sin años.

import { describe, it } from "vitest";
import { assertProperty, fc } from "@/test/property";
import { TIMELINE_MIN_ROWS, lineupTimeline, yearOfDate, type TimelineMember } from "./lineup-timeline";

const date = fc.option(fc.integer({ min: 1950, max: 2026 }).map(String), { nil: null });
const period = fc.record({ beginDate: date, endDate: date, ended: fc.boolean() });
const memberArb = (prefix: string) =>
  fc.array(
    fc.record({
      lines: fc.array(fc.record({ instruments: fc.subarray(["vocals", "guitar", "drums", "bass"]), periods: fc.array(period, { maxLength: 3 }) }), { maxLength: 3 }),
    }),
    { maxLength: 8 },
  ).map((members) => members.map((m, i): TimelineMember => ({ artistId: `${prefix}${i}`, name: `${prefix}${i}`, lines: m.lines })));
const groupArb = fc.record({ lifeBegin: date, lifeEnd: date, lifeEnded: fc.option(fc.boolean(), { nil: null }) });

const dated = (m: TimelineMember) => m.lines.some((l) => l.periods.some((p) => yearOfDate(p.beginDate) !== null || yearOfDate(p.endDate) !== null));

describe("lineupTimeline (propiedades)", () => {
  it("tramos dentro del eje y hacia adelante; filas = integrantes con algún año", () => {
    assertProperty(
      fc.property(memberArb("c"), memberArb("p"), groupArb, (current, past, group) => {
        const data = lineupTimeline({ current, past }, group, 2026);
        const expected = [...current, ...past].filter(dated);
        if (expected.length < TIMELINE_MIN_ROWS) return data === null;
        if (!data) return false;
        const ids = new Set(expected.map((m) => m.artistId));
        return (
          data.rows.length === expected.length &&
          data.rows.every((row) => ids.has(row.artistId)) &&
          data.from < data.to &&
          data.rows.every((row) => row.segments.every((s) => s.from <= s.to && s.from >= data.from && s.to <= data.to))
        );
      }),
    );
  });

  it("cada período con algún año da uno o dos tramos (instrumento y voz); los demás, ninguno", () => {
    assertProperty(
      fc.property(memberArb("c"), memberArb("p"), groupArb, (current, past, group) => {
        const data = lineupTimeline({ current, past }, group, 2026);
        if (!data) return true;
        const byId = new Map([...current, ...past].map((m) => [m.artistId, m]));
        return data.rows.every((row) => {
          const datedPeriods = byId.get(row.artistId)!.lines.flatMap((l) => l.periods).filter((p) => yearOfDate(p.beginDate) !== null || yearOfDate(p.endDate) !== null);
          return row.segments.length >= datedPeriods.length && row.segments.length <= 2 * datedPeriods.length;
        });
      }),
    );
  });
});
