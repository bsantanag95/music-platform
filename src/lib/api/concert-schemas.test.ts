import { describe, expect, it } from "vitest";
import {
  CreateConcertRequestSchema,
  SETLISTFM_SETLIST_URL_PATTERN,
  UpdateConcertRequestSchema,
  isValidConcertDate,
} from "./schemas";

// Esquemas de Mis conciertos (openspec: add-my-concerts). Las reglas de formato y largo se repiten como CHECK en
// `concert_entry` (0091); "no futura" vive solo acá y en el servicio.

const ARTIST = "550e8400-e29b-41d4-a716-446655440000";
const NOW = new Date("2026-11-11T12:00:00Z");

describe("isValidConcertDate", () => {
  it.each(["2019", "2019-11", "2019-11-02", "1969-08-15", "2026", "2026-11", "2026-11-11"])("acepta %s", (value) => {
    expect(isValidConcertDate(value, NOW)).toBe(true);
  });

  it.each([
    ["2019-13", "mes inexistente"],
    ["2019-02-30", "día inexistente"],
    ["2019-1", "mes sin cero"],
    ["19", "año corto"],
    ["1899", "antes de 1900"],
    ["2027", "año futuro"],
    ["2026-12", "mes futuro"],
    ["2026-11-20", "día futuro"],
    ["", "vacía"],
  ])("rechaza %s (%s)", (value) => {
    expect(isValidConcertDate(value, NOW)).toBe(false);
  });

  it("el 'hoy' es el de la zona más adelantada: un concierto de mañana en UTC sigue valiendo si allá ya es mañana", () => {
    expect(isValidConcertDate("2026-11-12", new Date("2026-11-11T12:00:00Z"))).toBe(true);
    expect(isValidConcertDate("2026-11-13", new Date("2026-11-11T12:00:00Z"))).toBe(false);
  });
});

describe("SETLISTFM_SETLIST_URL_PATTERN", () => {
  it("acepta un setlist de setlist.fm, con y sin www", () => {
    expect(SETLISTFM_SETLIST_URL_PATTERN.test("https://www.setlist.fm/setlist/the-strokes/2023/interlagos-1b2c3d4.html")).toBe(true);
    expect(SETLISTFM_SETLIST_URL_PATTERN.test("https://setlist.fm/setlist/x/2019/y-1.html")).toBe(true);
  });

  it.each([
    "https://www.setlist.fm/setlists/motley-crue-bd6b5d2.html",
    "http://www.setlist.fm/setlist/x.html",
    "https://setlist.fm.example.com/setlist/x.html",
    "https://www.songkick.com/concerts/1",
  ])("rechaza %s", (value) => {
    expect(SETLISTFM_SETLIST_URL_PATTERN.test(value)).toBe(false);
  });
});

describe("CreateConcertRequestSchema", () => {
  it("registro mínimo: artista y año", () => {
    const parsed = CreateConcertRequestSchema.parse({ artistId: ARTIST, eventDate: "2019" });
    expect(parsed).toMatchObject({ artistId: ARTIST, eventDate: "2019" });
  });

  it("recorta los textos, vacío pasa a null y el país va en mayúsculas", () => {
    const parsed = CreateConcertRequestSchema.parse({
      artistId: ARTIST,
      eventDate: "2023-03-20",
      country: "br",
      city: "  São Paulo ",
      venue: "",
      tour: "   ",
      note: "Con amigos",
      setlistfmUrl: "",
    });
    expect(parsed).toMatchObject({ country: "BR", city: "São Paulo", venue: null, tour: null, note: "Con amigos", setlistfmUrl: null });
  });

  it.each([
    [{ eventDate: "2019-13" }, "fecha inválida"],
    [{ eventDate: "2999" }, "fecha futura"],
    [{ country: "Chile" }, "país que no es un código"],
    [{ setlistfmUrl: "https://www.setlist.fm/setlists/x.html" }, "página de artista, no un setlist"],
    [{ city: "x".repeat(101) }, "ciudad demasiado larga"],
    [{ note: "x".repeat(141) }, "nota demasiado larga"],
    [{ audience: "everyone" }, "audiencia inválida"],
  ] as [Record<string, string>, string][])("rechaza %j (%s)", (overrides) => {
    expect(CreateConcertRequestSchema.safeParse({ artistId: ARTIST, eventDate: "2019", ...overrides }).success).toBe(false);
  });

  it("exige el artista", () => {
    expect(CreateConcertRequestSchema.safeParse({ eventDate: "2019" }).success).toBe(false);
  });
});

describe("UpdateConcertRequestSchema", () => {
  it("acepta un solo campo y deja el resto sin cambio", () => {
    expect(UpdateConcertRequestSchema.parse({ eventDate: "2019-11-02" })).toEqual({ eventDate: "2019-11-02" });
  });

  it("null quita un dato opcional", () => {
    expect(UpdateConcertRequestSchema.parse({ venue: null })).toMatchObject({ venue: null });
  });

  it("rechaza una modificación vacía", () => {
    expect(UpdateConcertRequestSchema.safeParse({}).success).toBe(false);
  });
});
