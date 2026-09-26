import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
const { classifyPersonnel, groupCreditsByTrack, leadKindOf, relationKind } = await import("./personnel-levels");

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

  it("quien produce y también toca va a Producción y sonido, con la producción primero", () => {
    const result = classifyPersonnel(
      [c("levine", "instrument", "r2", ["organ"]), c("levine", "instrument", "r2", ["piano"]), c("levine", "producer", "r2")],
      TRACKS,
      new Set(),
    );
    expect(result.guests).toEqual([]);
    expect(result.production[0]?.roles.map((r) => r.relationType)).toEqual(["producer", "instrument", "instrument"]);
  });

  it("programar sin producir no saca a nadie de Músicos invitados", () => {
    const result = classifyPersonnel(
      [c("sterling", "instrument", "r5", ["drums"]), c("sterling", "programming", "r5")],
      TRACKS,
      new Set(),
    );
    expect(result.guests.map((e) => e.artistId)).toEqual(["sterling"]);
    expect(result.guests[0]?.roles.map((r) => r.relationType)).toEqual(["instrument", "programming"]);
  });

  it("un integrante con producción sigue en Integrantes", () => {
    const result = classifyPersonnel([c("gilmour", "producer", "r1"), c("gilmour", "instrument", "r1", ["guitar"])], TRACKS, new Set(["gilmour"]));
    expect(result.members.map((e) => e.artistId)).toEqual(["gilmour"]);
  });

  it("las pistas de cada persona llevan su recordingId", () => {
    const result = classifyPersonnel([c("torry", "vocal", "r5")], TRACKS, new Set());
    expect(result.guests[0]?.tracks).toEqual([{ recordingId: "r5", discNumber: 1, position: 5 }]);
  });
});

describe("groupCreditsByTrack", () => {
  it("agrupa por pista en Producción, Intérpretes, Sonido y Otros", () => {
    const { tracks } = groupCreditsByTrack(
      [
        c("levine", "producer", "r2"),
        c("levine", "instrument", "r2", ["organ"]),
        c("sosin", "instrument", "r2", ["ukulele"]),
        c("piscina", "engineer", "r2"),
        c("storm", "design", "r2"),
      ],
      TRACKS,
    );
    const r2 = tracks.r2!;
    expect(r2.production.map((p) => p.artistId)).toEqual(["levine"]);
    expect(r2.performers.map((p) => [p.artistId, p.roles[0]?.attributes])).toEqual([
      ["levine", ["organ"]],
      ["sosin", ["ukulele"]],
    ]);
    expect(r2.sound.map((p) => p.artistId)).toEqual(["piscina"]);
    expect(r2.other.map((p) => p.artistId)).toEqual(["storm"]);
    expect(tracks.r1).toBeUndefined();
  });

  it("los créditos de nivel edición van a todo el álbum; los de otras grabaciones se ignoran", () => {
    const { albumWide, tracks } = groupCreditsByTrack(
      [c("mastering-guy", "mastering", null), c("x", "instrument", "fuera-del-album")],
      TRACKS,
    );
    expect(albumWide.sound.map((p) => p.artistId)).toEqual(["mastering-guy"]);
    expect(Object.keys(tracks)).toEqual([]);
  });

  it("no repite un rol idéntico de la misma persona en la misma pista", () => {
    const { tracks } = groupCreditsByTrack([c("a", "vocal", "r1"), c("a", "vocal", "r1")], TRACKS);
    expect(tracks.r1!.performers[0]?.roles).toHaveLength(1);
  });
});
