import { describe, expect, it } from "vitest";
import kuervosEvents from "./__fixtures__/kuervos-del-sur-events.json";
import { mapEventToConcert } from "./event-mappers";
import type { MBEvent, MBEventBrowseResponse } from "./types";

// Normalización de eventos de MusicBrainz (openspec: add-shared-concerts-phase1). Fixture real: los 2 eventos de
// Kuervos del Sur (browse del 2026-11-11).

const KUERVOS = kuervosEvents as MBEventBrowseResponse;

function event(overrides: Partial<MBEvent> = {}): MBEvent {
  return {
    id: "00000000-0000-4000-8000-0000000000e1",
    name: "Concierto",
    type: "Concert",
    cancelled: false,
    "life-span": { begin: "2019-11-02" },
    relations: [],
    ...overrides,
  };
}

describe("mapEventToConcert", () => {
  it("festival real: nombre, fecha, recinto, ciudad sin país y cartel por rol", () => {
    const vive = KUERVOS.events.find((e) => e.name === "Vive Rock 2023")!;
    const concert = mapEventToConcert(vive)!;
    expect(concert).toMatchObject({
      mbid: vive.id,
      name: "Vive Rock 2023",
      kind: "festival",
      eventDate: "2023-04-22",
      venue: "Santander Arena",
      city: "Santiago",
      country: null,
      cancelled: false,
    });
    const main = concert.performers.filter((p) => p.role === "main").map((p) => p.artistName);
    expect(main).toEqual(expect.arrayContaining(["Chancho en Piedra", "Kuervos del Sur", "Pettinellis", "Saiko"]));
    expect(concert.performers.find((p) => p.artistName === "El Cruce")?.role).toBe("support");
    // Principales primero, posiciones consecutivas.
    const roles = concert.performers.map((p) => p.role);
    expect(roles.indexOf("support")).toBeGreaterThan(roles.lastIndexOf("main"));
    expect(concert.performers.map((p) => p.position)).toEqual(concert.performers.map((_, i) => i));
  });

  it("todos los eventos del fixture se importan", () => {
    expect(KUERVOS.events.map(mapEventToConcert).every(Boolean)).toBe(true);
  });

  it.each([
    [{ type: "Award ceremony" }, "entrega de premios"],
    [{ type: "Convention/Expo" }, "convención"],
    [{ type: null }, "sin tipo"],
    [{ "life-span": { begin: "1972-11" } }, "fecha parcial"],
    [{ "life-span": {} }, "sin fecha"],
    [{ name: "   " }, "sin nombre"],
  ] as [Partial<MBEvent>, string][])("no importa %j (%s)", (overrides) => {
    expect(mapEventToConcert(event(overrides as Partial<MBEvent>))).toBeNull();
  });

  it("un cancelado se devuelve marcado", () => {
    expect(mapEventToConcert(event({ cancelled: true }))?.cancelled).toBe(true);
  });

  it("país solo cuando el área es un país", () => {
    const inCountry = mapEventToConcert(
      event({ relations: [{ "target-type": "area", area: { id: "a", name: "Chile", type: "Country", "iso-3166-1-codes": ["CL"] } }] }),
    )!;
    expect(inCountry).toMatchObject({ country: "CL", city: null, venue: null });
    const inCity = mapEventToConcert(event({ relations: [{ "target-type": "area", area: { id: "b", name: "Lima", type: "City" } }] }))!;
    expect(inCity).toMatchObject({ country: null, city: "Lima" });
  });

  it("ignora otras relaciones de artista y no repite un artista con el mismo rol", () => {
    const artist = { id: "00000000-0000-4000-8000-0000000000a1", name: "Banda" };
    const concert = mapEventToConcert(
      event({
        relations: [
          { "target-type": "artist", type: "main performer", artist },
          { "target-type": "artist", type: "main performer", artist },
          { "target-type": "artist", type: "conductor", artist: { id: "x", name: "Otro" } },
          { "target-type": "artist", type: "guest performer", artist },
        ],
      }),
    )!;
    expect(concert.performers.map((p) => [p.artistName, p.role])).toEqual([
      ["Banda", "main"],
      ["Banda", "guest"],
    ]);
  });

  it("recorta un nombre más largo que el tope de la base", () => {
    expect(mapEventToConcert(event({ name: "x".repeat(400) }))?.name).toHaveLength(300);
  });
});
