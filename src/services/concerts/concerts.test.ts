import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addConcert,
  countOwnConcertsForArtist,
  getConcertPreview,
  listOwnConcerts,
  listProfileConcerts,
  removeConcert,
  updateConcert,
} from "./concerts";

// Servicio de Mis conciertos (openspec: add-my-concerts). La base se simula con una cadena que resuelve, en orden, los
// resultados encolados; el SQL real (CHECK, orden, visibilidad, cascadas) lo verifica scripts/smoke-test-concerts.ts.

const mocks = vi.hoisted(() => ({
  results: [] as unknown[],
  calls: [] as string[],
  inserted: [] as unknown[],
  patched: [] as unknown[],
  getProfileByUsername: vi.fn(),
  resolveAudience: vi.fn(),
}));

function chain(kind: string): unknown {
  mocks.calls.push(kind);
  const result = mocks.results.shift() ?? [];
  const proxy: Record<string, unknown> = {};
  for (const method of ["from", "innerJoin", "where", "orderBy", "limit", "returning"]) proxy[method] = () => proxy;
  proxy.values = (values: unknown) => {
    mocks.inserted.push(values);
    return proxy;
  };
  proxy.set = (values: unknown) => {
    mocks.patched.push(values);
    return proxy;
  };
  proxy.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
    result instanceof Error ? reject(result) : resolve(result);
  return proxy;
}

vi.mock("@/db", () => ({
  db: {
    select: () => chain("select"),
    insert: () => chain("insert"),
    update: () => chain("update"),
    delete: () => chain("delete"),
  },
}));
vi.mock("@/services/social/default-audience", () => ({ resolveNewContentAudience: mocks.resolveAudience }));
vi.mock("@/services/social/profiles", () => ({ getProfileByUsername: mocks.getProfileByUsername }));

const USER = "00000000-0000-4000-8000-000000000001";
const ARTIST = "00000000-0000-4000-8000-0000000000a1";
const ENTRY = "00000000-0000-4000-8000-0000000000c1";
const row = {
  id: ENTRY,
  artistId: ARTIST,
  artistName: "Soda Stereo",
  eventDate: "2007-10-20",
  country: "AR",
  city: "Buenos Aires",
  venue: "Estadio River Plate",
  tour: "Me verás volver",
  setlistfmUrl: null,
  note: null,
  audience: "followers",
  createdAt: new Date("2026-11-11T00:00:00Z"),
  updatedAt: new Date("2026-11-11T00:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.results = [];
  mocks.calls = [];
  mocks.inserted = [];
  mocks.patched = [];
  mocks.resolveAudience.mockImplementation(async (_user: string, _type: string, explicit?: string) => explicit ?? "followers");
});

describe("addConcert", () => {
  it("crea el registro con la audiencia resuelta para el tipo concert y lo devuelve con el artista", async () => {
    mocks.results = [[{ id: ARTIST }], [{ id: ENTRY }], [row]];
    const entry = await addConcert(USER, { artistId: ARTIST, eventDate: "2007-10-20", city: "Buenos Aires" });

    expect(mocks.resolveAudience).toHaveBeenCalledWith(USER, "concert", undefined);
    expect(mocks.inserted[0]).toMatchObject({ userId: USER, artistId: ARTIST, eventDate: "2007-10-20", city: "Buenos Aires", venue: null, audience: "followers" });
    expect(entry).toMatchObject({ id: ENTRY, artist: { id: ARTIST, name: "Soda Stereo" }, eventDate: "2007-10-20" });
  });

  it("artista inexistente: ARTIST_NOT_FOUND sin insertar", async () => {
    mocks.results = [[]];
    await expect(addConcert(USER, { artistId: ARTIST, eventDate: "2019" })).rejects.toMatchObject({ code: "ARTIST_NOT_FOUND", status: 404 });
    expect(mocks.calls).not.toContain("insert");
  });

  it("fecha inválida o futura: VALIDATION_ERROR sin consultar la base", async () => {
    await expect(addConcert(USER, { artistId: ARTIST, eventDate: "2999" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(addConcert(USER, { artistId: ARTIST, eventDate: "2019-02-30" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.calls).toEqual([]);
  });
});

describe("updateConcert", () => {
  it("solo escribe los campos indicados (null quita el dato)", async () => {
    mocks.results = [[{ id: ENTRY }], [{ ...row, venue: null }]];
    await updateConcert(ENTRY, USER, { eventDate: "2007-10-21", venue: null });
    expect(mocks.patched[0]).toEqual({ eventDate: "2007-10-21", venue: null });
  });

  it("registro ajeno o inexistente: CONCERT_NOT_FOUND", async () => {
    mocks.results = [[]];
    await expect(updateConcert(ENTRY, USER, { note: "x" })).rejects.toMatchObject({ code: "CONCERT_NOT_FOUND", status: 404 });
  });

  it("cambiar a un artista inexistente: ARTIST_NOT_FOUND", async () => {
    mocks.results = [[]];
    await expect(updateConcert(ENTRY, USER, { artistId: ARTIST })).rejects.toMatchObject({ code: "ARTIST_NOT_FOUND" });
  });
});

describe("removeConcert", () => {
  it("registro ajeno o inexistente: CONCERT_NOT_FOUND", async () => {
    mocks.results = [[]];
    await expect(removeConcert(ENTRY, USER)).rejects.toMatchObject({ code: "CONCERT_NOT_FOUND" });
  });
});

describe("listas", () => {
  it("lista propia con totales", async () => {
    mocks.results = [[row], [{ concerts: 1, artists: 1, countries: 1 }]];
    await expect(listOwnConcerts(USER)).resolves.toMatchObject({
      entries: [{ id: ENTRY }],
      totals: { concerts: 1, artists: 1, countries: 1 },
      truncated: false,
    });
  });

  it("perfil sin permiso (bloqueo o privado): lista vacía sin leer conciertos", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: USER, profileVisibility: "private", relation: "none", blockedByMe: false });
    await expect(listProfileConcerts("ana", null)).resolves.toEqual({
      entries: [],
      totals: { concerts: 0, artists: 0, countries: 0 },
      truncated: false,
    });
    expect(mocks.calls).toEqual([]);
  });

  it("riel del perfil: los últimos visibles y el total", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: USER, profileVisibility: "public", relation: "none", blockedByMe: false });
    mocks.results = [[row], [{ n: 4 }]];
    await expect(getConcertPreview("ana", null)).resolves.toMatchObject({ entries: [{ id: ENTRY }], total: 4 });
  });

  it("cifra del panel del artista", async () => {
    mocks.results = [[{ n: 3 }]];
    await expect(countOwnConcertsForArtist(USER, ARTIST)).resolves.toBe(3);
  });
});
