import { describe, it, expect } from "vitest";
import {
  mapArtistMemberships,
  mapArtistSupports,
  mapReleaseGroupCategory,
  normalizeReleaseDate,
} from "./mappers";
import motleyCrue from "./__fixtures__/motley-crue-artist-with-relations.json";
import randyCastillo from "./__fixtures__/randy-castillo-artist-with-relations.json";
import type { MBArtistDetail, MBReleaseGroupSearchItem } from "./types";

const MOTLEY_CRUE = motleyCrue as MBArtistDetail;
const RANDY_CASTILLO = randyCastillo as MBArtistDetail;
const NO_PERIOD = { beginDate: null, endDate: null, ended: false, instruments: [], isFounder: false, isAdditional: false };

describe("mapeo de resultados de búsqueda de release-groups", () => {
  const item = (overrides: Partial<MBReleaseGroupSearchItem> = {}): MBReleaseGroupSearchItem => ({
    id: "8f3d5c2a-4d2e-4b8a-9c6f-1f2e3d4c5b6a",
    title: "Toxicity",
    "primary-type": "Album",
    score: 100,
    ...overrides,
  });

  it("mapea la categoría a partir de primary-type / secondary-types", () => {
    expect(mapReleaseGroupCategory(item()["primary-type"], item()["secondary-types"])).toBe("studio");
    expect(
      mapReleaseGroupCategory("Single", item()["secondary-types"]),
    ).toBe("single_ep");
    expect(mapReleaseGroupCategory("Album", ["Compilation"])).toBe("compilation");
    expect(mapReleaseGroupCategory("Album", ["Live"])).toBe("live_other");
    expect(mapReleaseGroupCategory("Other", [])).toBe("live_other");
  });

  it("un Album con tipos secundarios no es de estudio (demo, remix…), salvo Soundtrack", () => {
    expect(mapReleaseGroupCategory("Album", [])).toBe("studio");
    expect(mapReleaseGroupCategory("Album", undefined)).toBe("studio");
    for (const secondary of ["Demo", "Remix", "DJ-mix", "Mixtape/Street", "Spokenword", "Interview", "Field recording"]) {
      expect(mapReleaseGroupCategory("Album", [secondary])).toBe("live_other");
    }
    // More, Obscured by Clouds: bandas sonoras que se cuentan entre los álbumes de estudio.
    expect(mapReleaseGroupCategory("Album", ["Soundtrack"])).toBe("studio");
    expect(mapReleaseGroupCategory("Album", ["Soundtrack", "Remix"])).toBe("live_other");
    expect(mapReleaseGroupCategory("Album", ["Compilation", "Demo"])).toBe("compilation");
    expect(mapReleaseGroupCategory("Single", ["Remix"])).toBe("single_ep");
  });

  it("conserva el año solo si la fecha viene completa; una fecha parcial no se inventa", () => {
    expect(normalizeReleaseDate(item({ "first-release-date": "2001-09-18" })["first-release-date"])).toBe("2001-09-18");
    expect(normalizeReleaseDate(item({ "first-release-date": "2001" })["first-release-date"])).toBeNull();
    expect(normalizeReleaseDate(item()["first-release-date"])).toBeNull();
  });
});

describe("normalizeReleaseDate", () => {
  it("conserva una fecha completa YYYY-MM-DD", () => {
    expect(normalizeReleaseDate("1985-06-15")).toBe("1985-06-15");
    expect(normalizeReleaseDate("1973-03-01")).toBe("1973-03-01");
  });

  it("devuelve null para una fecha con precisión anual", () => {
    expect(normalizeReleaseDate("1985")).toBeNull();
  });

  it("devuelve null para una fecha con precisión mensual", () => {
    expect(normalizeReleaseDate("1985-06")).toBeNull();
  });

  it("devuelve null cuando la fecha está ausente", () => {
    expect(normalizeReleaseDate(undefined)).toBeNull();
  });

  it("devuelve null para formatos inválidos", () => {
    expect(normalizeReleaseDate("15/06/1985")).toBeNull();
    expect(normalizeReleaseDate("1985-13-40")).toBeNull();
    expect(normalizeReleaseDate("invalid")).toBeNull();
    expect(normalizeReleaseDate("1985-06-15T00:00:00Z")).toBeNull();
  });
});

describe("mapArtistMemberships", () => {
  it("mapea persona y grupo en ambas direcciones", () => {
    const person = { id: "person", name: "Persona", type: "Person" as const };
    const group = { id: "group", name: "Banda", type: "Group" as const };

    expect(mapArtistMemberships({ ...person, relations: [{ type: "member of band", artist: group }] })).toEqual([
      { person, group, role: null, joinedOn: null, leftOn: null, ...NO_PERIOD },
    ]);
    expect(mapArtistMemberships({ ...group, relations: [{ type: "member of band", artist: person }] })).toEqual([
      { person, group, role: null, joinedOn: null, leftOn: null, ...NO_PERIOD },
    ]);
  });

  it("acepta Group, Orchestra y Choir, y conserva solo fechas completas", () => {
    for (const type of ["Group", "Orchestra", "Choir"] as const) {
      expect(mapArtistMemberships({
        id: "person",
        name: "Persona",
        type: "Person",
        relations: [{
          type: "member of band",
          artist: { id: type, name: type, type },
          attributes: ["bass", "vocals"],
          begin: "1965-01-02",
          end: "1980-06",
        }],
      })).toMatchObject([{ role: "bass, vocals", joinedOn: "1965-01-02", leftOn: null, beginDate: "1965-01-02", endDate: "1980-06" }]);
    }
  });

  it("ignora relaciones no aplicables o sin tipos confirmados", () => {
    expect(mapArtistMemberships({
      id: "person",
      name: "Persona",
      type: "Person",
      relations: [
        { type: "collaboration", artist: { id: "group", name: "Banda", type: "Group" } },
        { type: "member of band", artist: { id: "unknown", name: "Otro" } },
        { type: "member of band" },
      ],
    })).toEqual([]);
  });
});

describe("períodos de pertenencia (add-artist-lineup-data)", () => {
  const byName = (name: string) => mapArtistMemberships(MOTLEY_CRUE).filter((m) => m.person.name === name);

  it("devuelve un período por relación: quien se fue y volvió trae varios", () => {
    const vince = byName("Vince Neil");
    expect(vince.map((m) => [m.beginDate, m.endDate, m.ended])).toEqual([
      ["1981-01-17", "1992", true],
      ["1997", "2015-12-31", true],
      ["2018", null, false],
    ]);
    expect(vince.every((m) => m.isFounder)).toBe(true);
  });

  it("separa las marcas de fundador y adicional de los instrumentos", () => {
    const [nikki] = byName("Nikki Sixx");
    expect(nikki!.instruments).toEqual(["electric bass guitar"]);
    expect(nikki!.role).toBe("electric bass guitar");
    expect(nikki!.isFounder).toBe(true);
    const [dj] = byName("DJ Larceny");
    expect(dj).toMatchObject({ instruments: ["turntable"], isAdditional: true, isFounder: false, beginDate: null, ended: false });
  });

  it("conserva la precisión parcial en el período y solo fechas completas en el resumen", () => {
    const [john5] = byName("John 5");
    expect(john5).toMatchObject({ beginDate: "2022-10-27", joinedOn: "2022-10-27" });
    const [corabi] = byName("John Corabi");
    expect(corabi).toMatchObject({ beginDate: "1992", endDate: "1996", joinedOn: null, leftOn: null });
  });

  it("tampoco trata como instrumentos a eponymous ni principal", () => {
    const [m] = mapArtistMemberships({
      id: "g", name: "Fleetwood Mac", type: "Group",
      relations: [{ type: "member of band", direction: "backward", attributes: ["drums (drum set)", "eponymous", "principal"], artist: { id: "p", name: "Mick Fleetwood", type: "Person" } }],
    });
    expect(m!.instruments).toEqual(["drums (drum set)"]);
    expect(m!.role).toBe("drums (drum set)");
  });

  it("deja sin fechas una relación con fin anterior al inicio", () => {
    const [m] = mapArtistMemberships({
      id: "g", name: "Banda", type: "Group",
      relations: [{ type: "member of band", direction: "backward", begin: "2010", end: "2005", ended: true, artist: { id: "p", name: "P", type: "Person" } }],
    });
    expect(m).toMatchObject({ beginDate: null, endDate: null, ended: true });
  });
});

describe("mapArtistSupports", () => {
  it("lee el apoyo que recibe un grupo e ignora al músico sin tipo persona", () => {
    const supports = mapArtistSupports(MOTLEY_CRUE);
    expect(supports).toHaveLength(6);
    expect(supports.every((s) => s.supported.name === "Mötley Crüe" && s.kind === "instrumental")).toBe(true);
    expect(supports.find((s) => s.musician.name === "Samantha Maloney")).toMatchObject({
      instruments: ["drums (drum set)"], beginDate: "2000", endDate: "2002", ended: true,
    });
    expect(supports.some((s) => s.musician.name === "Motley Crew")).toBe(false);
  });

  it("lee el apoyo que da una persona, también a un solista", () => {
    const supports = mapArtistSupports(RANDY_CASTILLO);
    expect(supports.map((s) => [s.musician.name, s.supported.name, s.beginDate])).toEqual([
      ["Randy Castillo", "Ozzy Osbourne", "1983"],
      ["Randy Castillo", "Ozzy Osbourne", "1995"],
      ["Randy Castillo", "Lita Ford", null],
    ]);
  });

  it("mapea los tres tipos de relación de apoyo", () => {
    const musician = { id: "m", name: "M", type: "Person" };
    const kinds = ["instrumental supporting musician", "vocal supporting musician", "supporting musician"].map(
      (type) => mapArtistSupports({ id: "a", name: "A", type: "Person", relations: [{ type, direction: "backward", artist: musician }] })[0]?.kind,
    );
    expect(kinds).toEqual(["instrumental", "vocal", "general"]);
  });
});
