import { describe, expect, it } from "vitest";
import motleyCrue from "../musicbrainz/__fixtures__/motley-crue-artist-with-relations.json";
import pinkFloyd from "../musicbrainz/__fixtures__/pink-floyd-artist-with-relations.json";
import { mapArtistMemberships, mapArtistSupports } from "../musicbrainz/mappers";
import type { MBArtistDetail } from "../musicbrainz/types";
import {
  classifyLineup,
  instrumentLines,
  isCurrentAffiliation,
  type LineupPersonInput,
} from "./lineup-classify";

type Deaths = Record<string, string>;

/** Arma la entrada de la clasificación desde un lookup real, como la lectura desde la base. */
function lineupFrom(detail: MBArtistDetail, deaths: Deaths = {}) {
  const people = new Map<string, LineupPersonInput>();
  const supporters = new Map<string, LineupPersonInput>();
  const person = (map: Map<string, LineupPersonInput>, id: string, name: string) => {
    const entry = map.get(id) ?? { artistId: id, name, lifeEnded: name in deaths, lifeEnd: deaths[name] ?? null, periods: [] };
    map.set(id, entry);
    return entry;
  };
  for (const m of mapArtistMemberships(detail)) person(people, m.person.id, m.person.name).periods.push(m);
  for (const s of mapArtistSupports(detail)) person(supporters, s.musician.id, s.musician.name).periods.push(s);
  return { members: [...people.values()], supports: [...supporters.values()] };
}

const names = (people: { name: string }[]) => people.map((p) => p.name);

describe("classifyLineup", () => {
  const crue = lineupFrom(motleyCrue as MBArtistDetail, { "Randy Castillo": "2002-03-26" });
  const result = classifyLineup(crue.members, crue.supports, { lifeEnded: false, lifeEnd: null });

  it("separa actuales y antiguos, con fundadores primero y luego por año", () => {
    expect(result.lastLineup).toBe(false);
    expect(names(result.current)).toEqual(["Nikki Sixx", "Tommy Lee", "Vince Neil", "John 5", "DJ Larceny"]);
    expect(names(result.past)).toEqual(["Mick Mars", "John Corabi", "Randy Castillo"]);
  });

  it("un período sin fechas y sin terminar cuenta como actual", () => {
    const dj = result.current.find((p) => p.name === "DJ Larceny")!;
    expect(dj).toMatchObject({ isAdditional: true, isFounder: false });
    expect(dj.lines).toEqual([{ instruments: ["turntable"], periods: [{ beginDate: null, endDate: null, ended: false }] }]);
  });

  it("agrupa los instrumentos por conjunto de períodos", () => {
    const tommy = result.current.find((p) => p.name === "Tommy Lee")!;
    expect(tommy.lines.map((line) => [line.instruments, line.periods.map((p) => p.beginDate)])).toEqual([
      [["drums (drum set)"], ["1981-01-17", "2004", "2018"]],
      [["background vocals", "keyboard", "piano"], ["2018"]],
    ]);
  });

  it("marca el año de muerte", () => {
    const randy = result.past.find((p) => p.name === "Randy Castillo")!;
    expect(randy).toMatchObject({ deceased: true, deathYear: 2002 });
  });

  it("el apoyo de una banda activa se reparte en actual y anterior", () => {
    expect(result.supportCurrent).toEqual([]);
    expect(names(result.supportPast)).toEqual([
      "Samantha Maloney",
      "Josh Freese",
      "Will Hunt",
      "Frank Zummo",
      "Morgan Rose",
      "Glen Sobel",
    ]);
  });

  it("una persona fallecida con una relación abierta no es actual", () => {
    const stoneFury = classifyLineup(
      [{ artistId: "r", name: "Randy Castillo", lifeEnded: true, lifeEnd: "2002-03-26", periods: [{ beginDate: null, endDate: null, ended: false, instruments: [] }] }],
      [],
      { lifeEnded: false, lifeEnd: null },
    );
    expect(stoneFury.current).toEqual([]);
    expect(stoneFury.past[0]!.lines[0]!.periods[0]).toEqual({ beginDate: null, endDate: null, ended: true });
  });
});

describe("Última alineación de un grupo separado", () => {
  const floyd = lineupFrom(pinkFloyd as MBArtistDetail, { "Richard Wright": "2008-09-15", "Syd Barrett": "2006-07-07" });
  const result = classifyLineup(floyd.members, floyd.supports, { lifeEnded: true, lifeEnd: "2014" });

  it("la forman quienes siguen abiertos o terminan con el grupo", () => {
    expect(result.lastLineup).toBe(true);
    expect(names(result.current)).toEqual(["Nick Mason", "David Gilmour"]);
    expect(names(result.past)).toEqual(["Richard Wright", "Roger Waters", "Syd Barrett"]);
  });

  it("sus períodos abiertos terminan con el grupo", () => {
    const gilmour = result.current.find((p) => p.name === "David Gilmour")!;
    expect(gilmour.lines[0]!.periods).toEqual([{ beginDate: "1968-02-18", endDate: "2014", ended: true }]);
  });
});

describe("instrumentLines", () => {
  it("une las relaciones de distintos instrumentos con las mismas fechas en un período", () => {
    expect(
      instrumentLines([
        { beginDate: "1999", endDate: "2014", ended: true, instruments: ["guitar"] },
        { beginDate: "1999", endDate: "2014", ended: true, instruments: ["lead vocals"] },
        { beginDate: "2022", endDate: null, ended: false, instruments: ["guitar"] },
        { beginDate: "2022", endDate: null, ended: false, instruments: ["lead vocals"] },
      ]),
    ).toEqual([
      {
        instruments: ["guitar", "lead vocals"],
        periods: [
          { beginDate: "1999", endDate: "2014", ended: true },
          { beginDate: "2022", endDate: null, ended: false },
        ],
      },
    ]);
  });

  it("un período sin instrumentos forma su propia línea", () => {
    expect(
      instrumentLines([
        { beginDate: "1990", endDate: "1995", ended: true, instruments: [] },
        { beginDate: "1980", endDate: "1985", ended: true, instruments: ["guitar"] },
      ]),
    ).toEqual([
      { instruments: ["guitar"], periods: [{ beginDate: "1980", endDate: "1985", ended: true }] },
      { instruments: [], periods: [{ beginDate: "1990", endDate: "1995", ended: true }] },
    ]);
  });
});

describe("isCurrentAffiliation", () => {
  const open = [{ endDate: null, ended: false }];
  it("vigente solo si la persona vive, el otro artista no terminó y hay un período abierto", () => {
    expect(isCurrentAffiliation(open, false, false)).toBe(true);
    expect(isCurrentAffiliation(open, true, false)).toBe(false);
    expect(isCurrentAffiliation(open, false, true)).toBe(false);
    expect(isCurrentAffiliation([{ endDate: "1996", ended: true }], false, false)).toBe(false);
  });
});
