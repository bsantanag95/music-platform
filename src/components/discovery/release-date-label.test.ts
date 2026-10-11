import { describe, expect, it } from "vitest";
import { daysUntilRelease, releaseDateLabel } from "./release-date-label";

const today = new Date("2026-10-10T12:00:00Z");

describe("releaseDateLabel", () => {
  it("devuelve día y mes sin año si es el año actual", () => {
    expect(releaseDateLabel("2026-10-24", "es", today)).toMatch(/^24 oct/);
    expect(releaseDateLabel("2026-10-24", "en", today)).toMatch(/Oct 24/);
    expect(releaseDateLabel("2026-10-24", "es", today)).not.toContain("2026");
  });

  it("incluye el año si no es el actual", () => {
    expect(releaseDateLabel("2027-01-09", "es", today)).toContain("2027");
  });

  it("no corre el día por la zona horaria", () => {
    expect(releaseDateLabel("2026-11-01", "es", today)).toMatch(/^1 nov/);
  });

  it("devuelve undefined sin fecha o con fecha inválida", () => {
    expect(releaseDateLabel(null, "es", today)).toBeUndefined();
    expect(releaseDateLabel("no-es-fecha", "es", today)).toBeUndefined();
  });
});

describe("daysUntilRelease", () => {
  const today = new Date("2026-10-11T22:30:00Z");

  it("cuenta días de calendario: hoy 0, mañana 1", () => {
    expect(daysUntilRelease("2026-10-11", today)).toBe(0);
    expect(daysUntilRelease("2026-10-12", today)).toBe(1);
    expect(daysUntilRelease("2026-10-16", today)).toBe(5);
  });

  it("sin fecha, inválida o ya pasada: undefined", () => {
    expect(daysUntilRelease(null, today)).toBeUndefined();
    expect(daysUntilRelease("no-fecha", today)).toBeUndefined();
    expect(daysUntilRelease("2026-10-10", today)).toBeUndefined();
  });
});
