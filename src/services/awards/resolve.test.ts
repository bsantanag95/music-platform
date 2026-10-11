import { describe, expect, it, vi } from "vitest";
import type { MBRecordingSearchItem, MBReleaseGroupSearchItem } from "@/services/musicbrainz/types";
import { needsResolution, phrase, resolveArtist, resolveNominee, resolveRecording, resolveReleaseGroup, type NomineeSearch } from "./resolve";

const credit = (name: string, id = "a0000000-0000-4000-8000-000000000001") => [{ name, artist: { id, name } }];

const rg = (id: string, title: string, score: number, secondary: string[] = []): MBReleaseGroupSearchItem => ({
  id,
  title,
  score,
  "primary-type": "Album",
  "secondary-types": secondary,
  "first-release-date": "2024-06-07",
  "artist-credit": credit("Charli xcx"),
});

function search(overrides: Partial<NomineeSearch>): NomineeSearch {
  return {
    releaseGroups: vi.fn().mockResolvedValue([]),
    recordings: vi.fn().mockResolvedValue([]),
    artists: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("phrase", () => {
  it("escapa comillas y barras dentro de la frase Lucene", () => {
    expect(phrase('Say "Hi" \\o/')).toBe('"Say \\"Hi\\" \\\\o/"');
  });
});

describe("resolveReleaseGroup", () => {
  it("toma el único candidato fuerte sin tipos secundarios aunque haya un remix fuerte", async () => {
    const s = search({ releaseGroups: vi.fn().mockResolvedValue([rg("r1", "BRAT", 100), rg("r2", "Brat remix", 96, ["Remix"])]) });
    const result = await resolveReleaseGroup(s, "Brat", "Charli xcx");
    expect(result).toMatchObject({ status: "exact", mbid: "r1", seed: { kind: "release_group", title: "BRAT", category: "studio" } });
    expect(result.seed).toMatchObject({ credits: credit("Charli xcx"), firstReleaseDate: "2024-06-07" });
    expect(s.releaseGroups).toHaveBeenCalledWith('releasegroup:"Brat" AND artist:"Charli xcx"');
  });

  it("acepta un único fuerte con tipos secundarios (p. ej. una banda sonora nominada)", async () => {
    const s = search({ releaseGroups: vi.fn().mockResolvedValue([rg("r1", "Barbie", 100, ["Soundtrack"])]) });
    await expect(resolveReleaseGroup(s, "Barbie", "Various")).resolves.toMatchObject({ status: "exact", mbid: "r1" });
  });

  it("el álbum le gana a un sencillo homónimo (Future Nostalgia, 2019 contra 2020)", async () => {
    const single = { ...rg("s1", "Future Nostalgia", 100), "primary-type": "Single" };
    const s = search({ releaseGroups: vi.fn().mockResolvedValue([single, rg("a1", "Future Nostalgia", 100)]) });
    await expect(resolveReleaseGroup(s, "Future Nostalgia", "Dua Lipa")).resolves.toMatchObject({ status: "exact", mbid: "a1" });
  });

  it("deja ambiguo si hay dos limpios fuertes, sin elegir", async () => {
    const s = search({ releaseGroups: vi.fn().mockResolvedValue([rg("r1", "Same", 100), rg("r2", "Same", 100)]) });
    const result = await resolveReleaseGroup(s, "Same", "X");
    expect(result.status).toBe("ambiguous");
    expect(result.mbid).toBeUndefined();
    expect(result.candidates?.map((c) => c.mbid)).toEqual(["r1", "r2"]);
  });

  it("sin candidatos fuertes queda como no encontrado, con los mejores para elegir a mano", async () => {
    const s = search({ releaseGroups: vi.fn().mockResolvedValue([rg("r1", "Parecido", 80)]) });
    await expect(resolveReleaseGroup(s, "Otro", "X")).resolves.toMatchObject({
      status: "not_found",
      candidates: [expect.objectContaining({ mbid: "r1", score: 80 })],
    });
  });
});

describe("resolveArtist", () => {
  it("dos homónimos fuertes son ambiguos", async () => {
    const s = search({
      artists: vi.fn().mockResolvedValue([
        { id: "a1", name: "Nova", score: 100, disambiguation: "US rapper" },
        { id: "a2", name: "Nova", score: 100, disambiguation: "UK band" },
      ]),
    });
    await expect(resolveArtist(s, "Nova")).resolves.toMatchObject({ status: "ambiguous" });
  });

  it("el nombre idéntico le gana a uno parecido con puntaje fuerte", async () => {
    const s = search({
      artists: vi.fn().mockResolvedValue([
        { id: "a1", name: "CHIKA", score: 100 },
        { id: "a2", name: "Chika Chika", score: 96 },
      ]),
    });
    await expect(resolveArtist(s, "Chika")).resolves.toMatchObject({ status: "exact", mbid: "a1" });
  });

  it("un solo fuerte es exacto, con tipo y desambiguación en la semilla", async () => {
    const s = search({ artists: vi.fn().mockResolvedValue([{ id: "a1", name: "Doechii", score: 100, type: "Person", disambiguation: "US rapper" }]) });
    await expect(resolveArtist(s, "Doechii")).resolves.toMatchObject({
      status: "exact",
      seed: { kind: "artist", name: "Doechii", mbType: "Person", disambiguation: "US rapper" },
    });
  });
});

describe("resolveRecording", () => {
  const rec = (id: string, score: number, disambiguation?: string): MBRecordingSearchItem => ({
    id,
    title: "Not Like Us",
    score,
    length: 274_000,
    ...(disambiguation ? { disambiguation } : {}),
    "artist-credit": credit("Kendrick Lamar"),
  });

  it("busca dentro del disco ancla y prefiere la grabación sin desambiguación de versión", async () => {
    const s = search({
      releaseGroups: vi.fn().mockResolvedValue([rg("anchor", "Not Like Us", 100)]),
      recordings: vi.fn().mockResolvedValue([rec("main", 100), rec("main", 100), rec("atmos", 100, "Dolby Atmos mix")]),
    });
    const result = await resolveRecording(s, "Not Like Us", "Kendrick Lamar", { title: "Not Like Us", artist: "Kendrick Lamar" });
    expect(s.recordings).toHaveBeenCalledWith('recording:"Not Like Us" AND rgid:anchor');
    expect(result).toMatchObject({
      status: "exact",
      mbid: "main",
      seed: { kind: "recording", durationSec: 274, anchorMbid: "anchor", anchor: { kind: "release_group", title: "Not Like Us" } },
    });
  });

  it("sin una versión sin desambiguar, la explicit le gana a la clean y a las mezclas", async () => {
    const s = search({
      releaseGroups: vi.fn().mockResolvedValue([rg("anchor", "Sour", 100)]),
      recordings: vi.fn().mockResolvedValue([rec("clean", 100, "clean"), rec("explicit", 100, "explicit"), rec("atmos", 100, "Dolby Atmos mix, explicit")]),
    });
    await expect(resolveRecording(s, "Not Like Us", "K", { title: "Sour", artist: "K" })).resolves.toMatchObject({
      status: "exact",
      mbid: "explicit",
    });
  });

  it("dos versiones sin desambiguar en el mismo disco son ambiguas", async () => {
    const s = search({
      releaseGroups: vi.fn().mockResolvedValue([rg("anchor", "Disco", 100)]),
      recordings: vi.fn().mockResolvedValue([rec("v1", 100), rec("v2", 100)]),
    });
    await expect(resolveRecording(s, "Not Like Us", "K", { title: "Disco", artist: "K" })).resolves.toMatchObject({ status: "ambiguous" });
  });

  it("si el disco ancla no se resuelve, no busca la grabación", async () => {
    const s = search({ releaseGroups: vi.fn().mockResolvedValue([]) });
    await expect(resolveRecording(s, "X", "Y", { title: "Z", artist: "Y" })).resolves.toMatchObject({ status: "not_found" });
    expect(s.recordings).not.toHaveBeenCalled();
  });
});

describe("resolveNominee y needsResolution", () => {
  it("busca con searchAs cuando el texto oficial no coincide", async () => {
    const s = search({ releaseGroups: vi.fn().mockResolvedValue([]) });
    await resolveNominee(
      s,
      { title: "Justice (Triple Chucks Deluxe)", artist: "Justin Bieber", searchAs: { title: "Justice" }, won: false },
      "release_group",
    );
    expect(s.releaseGroups).toHaveBeenCalledWith('releasegroup:"Justice" AND artist:"Justin Bieber"');
  });

  it("una grabación sin ancla no se busca", async () => {
    const s = search({});
    await expect(resolveNominee(s, { title: "X", artist: "Y", won: true }, "recording")).resolves.toMatchObject({ status: "not_found" });
    expect(s.releaseGroups).not.toHaveBeenCalled();
  });

  it("respeta lo ya resuelto y solo reintenta ambiguos o no encontrados con retry", () => {
    const base = { title: "X", artist: "Y", won: true };
    expect(needsResolution(base, false)).toBe(true);
    expect(needsResolution({ ...base, resolved: { status: "exact", mbid: "11111111-1111-4111-8111-111111111111" } }, true)).toBe(false);
    expect(needsResolution({ ...base, resolved: { status: "manual", mbid: "11111111-1111-4111-8111-111111111111" } }, true)).toBe(false);
    expect(needsResolution({ ...base, resolved: { status: "ambiguous" } }, false)).toBe(false);
    expect(needsResolution({ ...base, resolved: { status: "ambiguous" } }, true)).toBe(true);
  });
});
