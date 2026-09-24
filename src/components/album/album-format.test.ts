import { describe, expect, it } from "vitest";
import { formatDuration, formatReleaseDate, formatStars, reviewHeadline, summarizeDurations } from "./album-format";

describe("formatDuration", () => {
  it("usa m:ss por debajo de una hora y h:mm:ss desde una hora", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3725)).toBe("1:02:05");
  });
});

describe("summarizeDurations", () => {
  it("suma las duraciones conocidas y marca el total como parcial si falta alguna", () => {
    expect(summarizeDurations([{ durationSec: 60 }, { durationSec: null }])).toEqual({
      trackCount: 2,
      totalSeconds: 60,
      partial: true,
    });
  });
});

describe("formatReleaseDate", () => {
  it("formatea la fecha completa sin correrse de día y cae al año si no hay fecha", () => {
    expect(formatReleaseDate("1973-03-24", 1973, "es")).toBe("24 de marzo de 1973");
    expect(formatReleaseDate(null, 1971, "es")).toBe("1971");
    expect(formatReleaseDate(null, null, "es")).toBeNull();
  });
});

describe("formatStars", () => {
  it("usa el separador decimal del idioma", () => {
    expect(formatStars(4.55, "es")).toBe("4,6");
    expect(formatStars(4, "en")).toBe("4.0");
  });
});

describe("reviewHeadline", () => {
  it("usa el título cuando existe y un extracto del cuerpo cuando no", () => {
    expect(reviewHeadline({ title: "Un clásico", body: "Texto" })).toBe("Un clásico");
    expect(reviewHeadline({ title: null, body: "Corto\n\ny limpio" })).toBe("Corto y limpio");
    const long = reviewHeadline({ title: null, body: "palabra ".repeat(40) });
    expect(long.endsWith("…")).toBe(true);
    expect(long.length).toBeLessThanOrEqual(91);
  });
});
