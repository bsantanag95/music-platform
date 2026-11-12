import { describe, expect, it } from "vitest";
import {
  concertDateBlock,
  concertDateParts,
  concertsByArtist,
  earliestConcertDate,
  formatConcertDate,
  formatConcertPlace,
  formatConcertShortDate,
  groupConcertsByYear,
  mostSeenArtist,
  needsPlace,
} from "./concert-format";
import { buildConcertDate } from "./ConcertFormDialog";

describe("formatConcertDate", () => {
  it("muestra la fecha con su precisión", () => {
    expect(formatConcertDate("2019", "es")).toBe("2019");
    expect(formatConcertDate("2019-11", "es")).toBe("noviembre de 2019");
    expect(formatConcertDate("2019-11-02", "es")).toBe("2 de noviembre de 2019");
    expect(formatConcertDate("2019-11-02", "en")).toBe("November 2, 2019");
  });

  it("no corre la fecha por la zona horaria", () => {
    expect(formatConcertDate("2023-01-01", "es")).toBe("1 de enero de 2023");
  });
});

describe("concertDateParts", () => {
  it("separa año, mes y día", () => {
    expect(concertDateParts("2019")).toEqual({ year: 2019, month: null, day: null });
    expect(concertDateParts("2019-11-02")).toEqual({ year: 2019, month: 11, day: 2 });
  });
});

describe("formatConcertPlace", () => {
  it("recinto, ciudad y país traducido, omitiendo lo que falta", () => {
    expect(formatConcertPlace({ venue: "Autódromo de Interlagos", city: "São Paulo", country: "BR" }, "es")).toBe(
      "Autódromo de Interlagos · São Paulo, Brasil",
    );
    expect(formatConcertPlace({ venue: null, city: null, country: "CL" }, "es")).toBe("Chile");
    expect(formatConcertPlace({ venue: "Teatro Caupolicán", city: null, country: null }, "es")).toBe("Teatro Caupolicán");
    expect(formatConcertPlace({ venue: null, city: null, country: null }, "es")).toBeNull();
  });
});

describe("groupConcertsByYear", () => {
  it("agrupa en el orden recibido, sin reordenar", () => {
    const groups = groupConcertsByYear([
      { eventDate: "2024-05-01" },
      { eventDate: "2019-11-02" },
      { eventDate: "2019" },
    ]);
    expect(groups.map((group) => [group.year, group.entries.length])).toEqual([
      ["2024", 1],
      ["2019", 2],
    ]);
  });
});

describe("buildConcertDate", () => {
  it("arma la fecha parcial con ceros", () => {
    expect(buildConcertDate("2019", "", "")).toBe("2019");
    expect(buildConcertDate("2019", "3", "")).toBe("2019-03");
    expect(buildConcertDate("2019", "3", "7")).toBe("2019-03-07");
  });

  it("sin un año de 4 cifras no hay fecha", () => {
    expect(buildConcertDate("19", "", "")).toBeNull();
    expect(buildConcertDate("", "3", "")).toBeNull();
  });
});

describe("formatConcertRange (add-shared-concerts-phase3)", () => {
  it("rango de un festival en el mismo mes", async () => {
    const { formatConcertRange } = await import("./shared-concert-format");
    expect(formatConcertRange("2019-06-26", "2019-06-30", "es")).toMatch(/26.*30.*junio.*2019/);
    expect(formatConcertRange("2019-06-26", "2019-06-30", "en")).toMatch(/June 26.*30.*2019/);
  });
});

describe("formatConcertShortDate", () => {
  it("bajo el encabezado de su año: día y mes corto, el mes entero o el año", () => {
    expect(formatConcertShortDate("2019-11-02", "es")).toBe("2 nov");
    expect(formatConcertShortDate("2019-11", "es")).toBe("noviembre");
    expect(formatConcertShortDate("2019", "es")).toBe("2019");
  });

  it("con el año cuando el encabezado no lo dice", () => {
    expect(formatConcertShortDate("2027-06-20", "es", true)).toBe("20 jun 2027");
    expect(formatConcertShortDate("2027-06", "es", true)).toBe("jun 2027");
    expect(formatConcertShortDate("2027-06-20", "en", true)).toBe("Jun 20, 2027");
  });
});

describe("resumen y vista por artista (redesign-my-concerts)", () => {
  const base = { id: "x", country: null, city: null, venue: null, tour: null, setlistfmUrl: null, note: null, audience: "public" as const, concertId: null, createdAt: "", updatedAt: "" };
  const e = (artist: string, eventDate: string, over = {}) => ({ ...base, artist: { id: artist, name: artist }, eventDate, ...over });

  it("bloque de fecha: día y mes, solo mes o una raya", () => {
    expect(concertDateBlock("2019-11-02", "es")).toEqual({ main: "2", sub: "nov" });
    expect(concertDateBlock("2022-05", "es")).toEqual({ main: "may", sub: null });
    expect(concertDateBlock("2008", "es")).toEqual({ main: "—", sub: null });
  });

  it("le falta lugar sin ciudad o sin país, salvo si está enlazado", () => {
    expect(needsPlace(e("A", "2020", { city: "Lima", country: "PE" }))).toBe(false);
    expect(needsPlace(e("A", "2020", { country: "DE" }))).toBe(true);
    expect(needsPlace(e("A", "2020", { concertId: "c" }))).toBe(false);
  });

  it("por artista: más vistos primero, con sus años; el más visto solo si es único y de más de una vez", () => {
    const entries = [e("Soda", "2019"), e("Mötley", "2022"), e("Soda", "2007"), e("Soda", "2014")];
    expect(concertsByArtist(entries).map((g) => [g.artist.name, g.count, g.firstYear, g.lastYear])).toEqual([
      ["Soda", 3, "2007", "2019"],
      ["Mötley", 1, "2022", "2022"],
    ]);
    expect(mostSeenArtist(entries)?.artist.name).toBe("Soda");
    expect(mostSeenArtist([e("A", "2020"), e("B", "2021")])).toBeNull();
    expect(earliestConcertDate(entries)).toBe("2007");
  });
});
