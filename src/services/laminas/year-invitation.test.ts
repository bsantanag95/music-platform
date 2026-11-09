// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

const execute = vi.fn();
vi.mock("@/db", () => ({ db: { execute: (...args: unknown[]) => execute(...args) } }));

import {
  parseDismissedYear,
  readYearInvitation,
  sendYearInvitations,
  yearInvitationFor,
  yearInvitationSendYear,
} from "./year-invitation";

describe("yearInvitationFor", () => {
  it.each([
    ["2026-12-01T03:00:00Z", "UTC", 2026],
    ["2026-12-31T23:00:00Z", "UTC", 2026],
    ["2027-01-15T23:00:00Z", "UTC", 2026],
    ["2026-11-30T23:00:00Z", "UTC", null],
    ["2027-01-16T00:00:00Z", "UTC", null],
    ["2026-07-10T12:00:00Z", "UTC", null],
  ])("%s en %s → %s", (iso, zone, expected) => {
    expect(yearInvitationFor(new Date(iso), zone)).toBe(expected);
  });

  it("usa la zona: las 02:00 UTC del 1 de diciembre son todavía noviembre en Santiago", () => {
    const now = new Date("2026-12-01T02:00:00Z");
    expect(yearInvitationFor(now, "UTC")).toBe(2026);
    expect(yearInvitationFor(now, "America/Santiago")).toBeNull();
  });

  it("y el 16 de enero en Tokio ya terminó aunque en UTC siga el 15", () => {
    const now = new Date("2027-01-15T20:00:00Z");
    expect(yearInvitationFor(now, "UTC")).toBe(2026);
    expect(yearInvitationFor(now, "Asia/Tokyo")).toBeNull();
  });
});

describe("yearInvitationSendYear", () => {
  it.each([
    ["2026-12-01T11:59:59Z", null],
    ["2026-12-01T12:00:00Z", 2026],
    ["2026-12-31T12:00:00Z", 2026],
    ["2027-01-16T11:59:59Z", 2026],
    ["2027-01-16T12:00:00Z", null],
    ["2026-11-20T12:00:00Z", null],
  ])("%s → %s", (iso, expected) => {
    expect(yearInvitationSendYear(new Date(iso))).toBe(expected);
  });
});

describe("parseDismissedYear", () => {
  it.each([
    ["2026", 2026],
    ["1999", null],
    ["abc", null],
    [undefined, null],
    ["20260", null],
  ])("%s → %s", (value, expected) => {
    expect(parseDismissedYear(value)).toBe(expected);
  });
});

describe("readYearInvitation", () => {
  const user = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";
  const december = new Date("2026-12-03T15:00:00Z");

  it("fuera de la ventana no consulta", async () => {
    execute.mockClear();
    expect(await readYearInvitation(user, "UTC", null, new Date("2026-11-03T15:00:00Z"))).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  it("descartada para ese año no consulta", async () => {
    execute.mockClear();
    expect(await readYearInvitation(user, "UTC", 2026, december)).toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  it("lo descartado del año anterior no cuenta", async () => {
    execute.mockResolvedValueOnce([{ show: true }]);
    expect(await readYearInvitation(user, "UTC", 2025, december)).toEqual({ year: 2026, inProgress: true });
  });

  it("en enero es el año anterior, ya cerrado", async () => {
    execute.mockResolvedValueOnce([{ show: true }]);
    expect(await readYearInvitation(user, "UTC", null, new Date("2027-01-10T15:00:00Z"))).toEqual({ year: 2026, inProgress: false });
  });

  it("sin escuchas visibles o ya compartido, nada", async () => {
    execute.mockResolvedValueOnce([{ show: false }]);
    expect(await readYearInvitation(user, "UTC", null, december)).toBeNull();
  });
});

describe("sendYearInvitations", () => {
  it("fuera de la ventana no escribe", async () => {
    execute.mockClear();
    expect(await sendYearInvitations({ now: new Date("2026-11-20T12:00:00Z") })).toEqual({ year: null, sent: 0 });
    expect(execute).not.toHaveBeenCalled();
  });

  it("dentro, cuenta lo insertado", async () => {
    execute.mockResolvedValueOnce([{ id: "a" }, { id: "b" }]);
    expect(await sendYearInvitations({ now: new Date("2026-12-02T12:00:00Z") })).toEqual({ year: 2026, sent: 2 });
  });

  it("la simulación solo cuenta", async () => {
    execute.mockResolvedValueOnce([{ n: 7 }]);
    expect(await sendYearInvitations({ now: new Date("2026-12-02T12:00:00Z"), dryRun: true })).toEqual({ year: 2026, sent: 7 });
  });
});
