import { describe, expect, it } from "vitest";
import { concertDateParts, formatConcertDate, formatConcertPlace, groupConcertsByYear } from "./concert-format";
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
