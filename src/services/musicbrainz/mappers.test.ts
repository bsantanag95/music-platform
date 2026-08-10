import { describe, it, expect } from "vitest";
import { mapArtistMemberships, normalizeReleaseDate } from "./mappers";

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
      { person, group, role: null, joinedOn: null, leftOn: null },
    ]);
    expect(mapArtistMemberships({ ...group, relations: [{ type: "member of band", artist: person }] })).toEqual([
      { person, group, role: null, joinedOn: null, leftOn: null },
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
      })).toMatchObject([{ role: "bass, vocals", joinedOn: "1965-01-02", leftOn: null }]);
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
