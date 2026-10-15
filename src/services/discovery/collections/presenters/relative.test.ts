import { describe, expect, it } from "vitest";
import { countdownNote, daysSince, relativeNote } from "./relative";

const today = new Date("2026-10-14T18:30:00Z");

describe("daysSince", () => {
  it("positivo si ya pasó, negativo si es futura, en UTC", () => {
    expect(daysSince("2026-10-09", today)).toBe(5);
    expect(daysSince("2026-10-14", today)).toBe(0);
    expect(daysSince("2026-10-20", today)).toBe(-6);
    expect(daysSince("2026-10-14", new Date("2026-10-14T23:59:59Z"))).toBe(0);
  });
});

describe("relativeNote", () => {
  it("hoy, ayer, días y semanas", () => {
    expect(relativeNote("2026-10-14", today)).toEqual({ key: "newReleasesToday" });
    expect(relativeNote("2026-10-13", today)).toEqual({ key: "newReleasesYesterday" });
    expect(relativeNote("2026-10-09", today)).toMatchObject({ key: "newReleasesDaysAgo", params: { days: 5 } });
    expect(relativeNote("2026-09-23", today)).toMatchObject({ key: "newReleasesWeeksAgo", params: { weeks: 3 } });
  });
});

describe("countdownNote", () => {
  it("hoy y mañana", () => {
    expect(countdownNote("2026-10-14", today)).toEqual({ key: "upcomingToday" });
    expect(countdownNote("2026-10-15", today)).toEqual({ key: "upcomingTomorrow" });
  });

  it("hasta las dos semanas, días con la fecha corta", () => {
    expect(countdownNote("2026-10-23", today)).toEqual({
      key: "upcomingDaysIn",
      params: { days: 9, date: { date: "2026-10-23", style: "day-month" } },
    });
    expect(countdownNote("2026-10-27", today)).toMatchObject({ key: "upcomingDaysIn", params: { days: 13 } });
  });

  it("desde las dos semanas, semanas (21 días son 3)", () => {
    expect(countdownNote("2026-11-04", today)).toMatchObject({ key: "upcomingWeeksIn", params: { weeks: 3 } });
    expect(countdownNote("2026-10-28", today)).toMatchObject({ key: "upcomingWeeksIn", params: { weeks: 2 } });
  });

  it("un disco que ya salió dice la verdad y nunca un número negativo", () => {
    expect(countdownNote("2026-10-11", today)).toEqual(relativeNote("2026-10-11", today));
    expect(countdownNote("2026-10-13", today)).toEqual({ key: "newReleasesYesterday" });
    expect(JSON.stringify(countdownNote("2026-10-11", today))).not.toContain('"days":-');
  });
});
