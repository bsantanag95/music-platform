import { describe, expect, it } from "vitest";
import { releaseDateLabel } from "./release-date-label";

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
