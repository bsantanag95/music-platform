import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
const { classifyPersonnel, leadKindOf, relationKind } = await import("./personnel-levels");

const TRACKS = [
  { recordingId: "r1", discNumber: 1, position: 1 },
  { recordingId: "r2", discNumber: 1, position: 2 },
  { recordingId: "r5", discNumber: 1, position: 5 },
];

function c(artistId: string, relationType: string, recordingId: string | null, attributes: string[] = []) {
  return { artistId, name: artistId, creditedAs: null, relationType, attributes, recordingId };
}

describe("leadKindOf", () => {
  it("es persona solo si todos los artistas principales son personas", () => {
    expect(leadKindOf(["person"])).toBe("person");
    expect(leadKindOf(["person", "person"])).toBe("person");
    expect(leadKindOf(["person", "group"])).toBe("group");
    expect(leadKindOf(["group"])).toBe("group");
    expect(leadKindOf([null])).toBe("group");
    expect(leadKindOf([])).toBe("group");
  });
});

describe("relationKind", () => {
  it("clasifica tipos de intérprete, producción y el resto", () => {
    expect(relationKind("instrument")).toBe("performer");
    expect(relationKind("vocal")).toBe("performer");
    expect(relationKind("mix")).toBe("production");
    expect(relationKind("design/illustration")).toBe("other");
    expect(relationKind("tipo-nuevo-de-musicbrainz")).toBe("other");
  });
});

describe("classifyPersonnel", () => {
  it("un integrante con instrumentos en todas las pistas y producción aparece solo en Integrantes", () => {
    const result = classifyPersonnel(
      [
        c("gilmour", "instrument", "r1", ["guitar"]),
        c("gilmour", "instrument", "r2", ["guitar"]),
        c("gilmour", "vocal", "r5"),
        c("gilmour", "producer", null),
      ],
      TRACKS,
      new Set(["gilmour"]),
    );
    expect(result.members).toHaveLength(1);
    expect(result.members[0]).toMatchObject({ artistId: "gilmour", tracks: "all" });
    expect(result.members[0]!.roles.map((r) => r.relationType).sort()).toEqual(["instrument", "producer", "vocal"]);
    expect(result.production).toEqual([]);
  });

  it("una vocalista no miembro en una sola pista es invitada con esa pista", () => {
    const result = classifyPersonnel([c("torry", "vocal", "r5")], TRACKS, new Set());
    expect(result.guests[0]).toMatchObject({ artistId: "torry", tracks: [{ discNumber: 1, position: 5 }] });
  });

  it("un ingeniero va a Producción y sonido; un tipo desconocido, a Arte y otros", () => {
    const result = classifyPersonnel([c("parsons", "engineer", "r1"), c("x", "tipo-nuevo", null)], TRACKS, new Set());
    expect(result.production.map((e) => e.artistId)).toEqual(["parsons"]);
    expect(result.other.map((e) => e.artistId)).toEqual(["x"]);
  });

  it("un miembro sin créditos de personal no aparece", () => {
    const result = classifyPersonnel([c("torry", "vocal", "r5")], TRACKS, new Set(["barrett"]));
    expect(result.members).toEqual([]);
  });

  it("ordena por participación y luego por nombre", () => {
    const result = classifyPersonnel(
      [c("b", "instrument", "r1"), c("a", "instrument", "r1"), c("z", "instrument", "r1"), c("z", "instrument", "r2")],
      TRACKS,
      new Set(),
    );
    expect(result.guests.map((e) => e.artistId)).toEqual(["z", "a", "b"]);
  });
});
