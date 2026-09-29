import { describe, expect, it } from "vitest";
import { formatInstrumentLine, formatLineupPeriod, formatLineupPeriods, repairSentenceSpacing } from "./artist-format";

const labels = { present: "presente", unknown: "período desconocido" };
const span = (beginDate: string | null, endDate: string | null, ended = endDate !== null) => ({ beginDate, endDate, ended });

describe("formatLineupPeriod", () => {
  it("usa solo años, con sus extremos desconocidos", () => {
    expect(formatLineupPeriod(span("1981-01-17", "1992"), labels)).toBe("1981–1992");
    expect(formatLineupPeriod(span("2018", null), labels)).toBe("2018–presente");
    expect(formatLineupPeriod(span("2005-06", "2005-08"), labels)).toBe("2005");
    expect(formatLineupPeriod(span(null, "1992"), labels)).toBe("?–1992");
    expect(formatLineupPeriod(span("1992", null, true), labels)).toBe("1992–?");
    expect(formatLineupPeriod(span(null, null), labels)).toBe("período desconocido");
    expect(formatLineupPeriod(span(null, null, true), labels)).toBe("período desconocido");
  });

  it("une varios períodos con coma", () => {
    expect(formatLineupPeriods([span("1981", "1992"), span("1997", "2015"), span("2018", null)], labels)).toBe(
      "1981–1992, 1997–2015, 2018–presente",
    );
  });
});

describe("formatInstrumentLine", () => {
  const dictionary: Record<string, string> = { "drums (drum set)": "batería", "background vocals": "coros", keyboard: "teclados" };
  const label = (raw: string) => dictionary[raw] ?? raw;

  it("traduce, pone mayúscula inicial y agrega los períodos", () => {
    expect(formatInstrumentLine({ instruments: ["background vocals", "keyboard"], periods: [span("2018", null)] }, { ...labels, label })).toBe(
      "Coros, teclados (2018–presente)",
    );
  });

  it("deja el término de MusicBrainz si no hay traducción", () => {
    expect(formatInstrumentLine({ instruments: ["theremin"], periods: [span("1990", "1995")] }, { ...labels, label })).toBe("Theremin (1990–1995)");
  });

  it("agrega la marca de adicional y el período desconocido", () => {
    expect(
      formatInstrumentLine({ instruments: ["turntable"], periods: [span(null, null)] }, { ...labels, label: () => "tornamesa", additional: "adicional" }),
    ).toBe("Tornamesa · adicional (período desconocido)");
  });

  it("sin instrumentos muestra solo los años", () => {
    expect(formatInstrumentLine({ instruments: [], periods: [span("1990", "1995")] }, { ...labels, label })).toBe("1990–1995");
  });
});

describe("repairSentenceSpacing", () => {
  it("restituye el espacio perdido entre oraciones", () => {
    expect(repairSentenceSpacing("actriz estadounidense.Obtuvo reconocimiento")).toBe("actriz estadounidense. Obtuvo reconocimiento");
    expect(repairSentenceSpacing("¿Quién?Él.")).toBe("¿Quién? Él.");
  });

  it("no toca siglas, decimales ni texto ya espaciado", () => {
    expect(repairSentenceSpacing("en los U.S.A. en 1.5 horas. Luego")).toBe("en los U.S.A. en 1.5 horas. Luego");
  });
});
