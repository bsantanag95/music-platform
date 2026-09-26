import { describe, expect, it } from "vitest";
import catalogEn from "../../../messages/en/catalog.json";
import catalogEs from "../../../messages/es/catalog.json";
import { compactTracks, formatRoles, messageKey } from "./credit-roles";

const credits = catalogEs.album.credits;

// Mismo lookup que `useRoleFormatter`: traducción o texto de MusicBrainz.
const label = (kind: "roles" | "attributes", raw: string) =>
  (credits[kind] as Record<string, string>)[messageKey(raw)] ?? raw;
const compound = (relationType: string, modifier: string) =>
  (credits.roles as Record<string, string>)[`${messageKey(relationType)}_${messageKey(modifier)}`] ?? null;
const roles = (...list: [string, ...string[]][]) =>
  formatRoles(
    list.map(([relationType, ...attributes]) => ({ relationType, attributes })),
    label,
    compound,
  );

describe("formatRoles: orden de los roles de intérprete", () => {
  it("vocalista con coros: voz principal, instrumento, coros", () => {
    expect(roles(["vocal", "background vocals"], ["vocal", "lead vocals"], ["instrument", "harmonica"])).toEqual([
      "voz principal",
      "armónica",
      "coros",
    ]);
  });

  it("baterista con percusión: la percusión menor va al final", () => {
    expect(roles(["instrument", "percussion"], ["instrument", "drums"], ["vocal", "background vocals"])).toEqual([
      "batería",
      "coros",
      "percusión",
    ]);
  });

  it("los roles que no son de intérprete no se mueven", () => {
    expect(roles(["producer"], ["instrument", "percussion"], ["instrument", "piano"])).toEqual([
      "producción",
      "piano",
      "percusión",
    ]);
    expect(roles(["instrument", "shakers"], ["mix"], ["vocal", "lead vocals"])).toEqual(["voz principal", "mezcla", "shakers"]);
  });

  it("a igual peso conserva el orden de MusicBrainz", () => {
    expect(roles(["instrument", "guitar", "bass", "organ"])).toEqual(["guitarra", "bajo", "órgano"]);
  });

  it("un rol instrumento con varios atributos se ordena por atributo", () => {
    expect(roles(["instrument", "tambourine", "guitar"], ["vocal", "other vocals"])).toEqual([
      "guitarra",
      "otras voces",
      "pandereta",
    ]);
  });
});

describe("traducciones de roles e instrumentos", () => {
  it("'other vocals' se lee 'otras voces' y 'video director' se traduce", () => {
    expect(roles(["vocal", "other vocals"])).toEqual(["otras voces"]);
    expect(roles(["video director"])).not.toEqual(["video director"]);
  });

  it("es y en tienen las mismas claves de roles y atributos", () => {
    for (const kind of ["roles", "attributes"] as const) {
      expect(Object.keys(catalogEn.album.credits[kind]).sort()).toEqual(Object.keys(catalogEs.album.credits[kind]).sort());
    }
  });
});

const track = (position: number, discNumber = 1) => ({ recordingId: `r${discNumber}-${position}`, discNumber, position });
const disc = (count: number, discNumber = 1) => Array.from({ length: count }, (_, i) => track(i + 1, discNumber));
const positions = (...list: number[]) => list.map((p) => track(p));

describe("compactTracks", () => {
  it("agrupa 3 o más consecutivas en un rango", () => {
    const result = compactTracks(positions(2, 3, 4, 5, 6, 9), disc(14));
    expect(result).toEqual({
      kind: "list",
      segments: [
        { kind: "range", from: track(2), to: track(6) },
        { kind: "single", track: track(9) },
      ],
    });
  });

  it("dos consecutivas no forman rango", () => {
    expect(compactTracks(positions(2, 3, 7), disc(14))).toEqual({
      kind: "list",
      segments: [2, 3, 7].map((p) => ({ kind: "single", track: track(p) })),
    });
  });

  it("no une pistas de discos distintos", () => {
    const tracks = [track(9), track(10), track(11), track(1, 2), track(2, 2), track(3, 2)];
    expect(compactTracks(tracks, [...disc(11), ...disc(3, 2), ...disc(5, 3)])).toEqual({
      kind: "list",
      segments: [
        { kind: "range", from: track(9), to: track(11) },
        { kind: "range", from: track(1, 2), to: track(3, 2) },
      ],
    });
  });

  it("todas salvo una o dos", () => {
    expect(compactTracks(positions(2, 3, 4, 5, 6, 7, 8, 9, 10, 11), disc(11))).toEqual({ kind: "except", tracks: [track(1)] });
    expect(compactTracks(positions(1, 2, 3, 5, 6, 8), disc(8))).toEqual({ kind: "except", tracks: [track(4), track(7)] });
  });

  it("con tres faltantes vuelve a la lista", () => {
    expect(compactTracks(positions(1, 2, 3, 4, 5), disc(8)).kind).toBe("list");
  });

  it("un disco corto no usa 'todas salvo'", () => {
    expect(compactTracks(positions(1, 2, 3), disc(4))).toEqual({
      kind: "list",
      segments: [{ kind: "range", from: track(1), to: track(3) }],
    });
  });

  it("sin la edición cargada no usa 'todas salvo'", () => {
    expect(compactTracks(positions(2, 3, 4, 5, 6)).kind).toBe("list");
  });
});
