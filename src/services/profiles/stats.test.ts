import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { getTasteFingerprint } from "./stats";

// Mock de db agnóstico a la forma de la cadena: `select().from(table)...` y
// cualquier terminal awaitable resuelve a lo que se haya puesto en
// `rowsByTable[<nombre de tabla>]`. Robusto ante Promise.all y distinto
// orden de queries.
const rowsByTable: Record<string, unknown[]> = {};

const mocks = vi.hoisted(() => ({ select: vi.fn(), getProfileByUsername: vi.fn() }));

vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: mocks.getProfileByUsername,
}));

function chainFor() {
  let table = "";
  const resolved = () => Promise.resolve(rowsByTable[table] ?? []);
  const step: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "from") {
          return (t: unknown) => {
            table = getTableName(t as Parameters<typeof getTableName>[0]);
            return step;
          };
        }
        if (prop === "then") return resolved().then.bind(resolved());
        if (prop === "catch") return resolved().catch.bind(resolved());
        if (prop === "finally") return resolved().finally.bind(resolved());
        return () => step;
      },
    },
  );
  return step;
}

const followerProfile = {
  id: "owner",
  username: "ana",
  profileVisibility: "public" as const,
  relation: "following" as const,
  blockedByMe: false,
  accessible: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rowsByTable)) delete rowsByTable[key];
  mocks.select.mockImplementation(() => chainFor());
});

describe("getTasteFingerprint", () => {
  it("devuelve null cuando el perfil no es accesible", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      ...followerProfile,
      accessible: false,
      relation: "none",
    });
    await expect(getTasteFingerprint("ana", "viewer")).resolves.toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("el seguidor ve la curva de valoraciones", async () => {
    mocks.getProfileByUsername.mockResolvedValue(followerProfile);
    // Una fila que satisface a la vez la query de curva (stars/n) y la de
    // conteo por tipo (artists/albums/songs).
    rowsByTable.rating = [{ stars: "4", n: 3, artists: 1, albums: 2, songs: 0 }];

    const fp = await getTasteFingerprint("ana", "viewer");
    expect(fp?.ratingsVisible).toBe(true);
    expect(fp?.ratingCurve).not.toBeNull();
    expect(fp?.totalRatings).toBe(3);
    expect(fp?.ratingCurve?.find((p) => p.stars === 4)?.count).toBe(3);
    expect(fp?.split).toMatchObject({ ratedArtists: 1, ratedAlbums: 2 });
  });

  it("el visitante sin relación no ve la curva", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      ...followerProfile,
      relation: "none",
    });
    rowsByTable.rating = [{ stars: "4", n: 3 }];

    const fp = await getTasteFingerprint("ana", null);
    expect(fp?.ratingsVisible).toBe(false);
    expect(fp?.ratingCurve).toBeNull();
    expect(fp?.totalRatings).toBe(0);
  });

  it("sin datos de género marca genreDataAvailable en false", async () => {
    mocks.getProfileByUsername.mockResolvedValue(followerProfile);
    rowsByTable.rating = [{ stars: "5", n: 1, artists: 0, albums: 1, songs: 0 }];
    rowsByTable.release_group_tag = [];

    const fp = await getTasteFingerprint("ana", "viewer");
    expect(fp?.genreDataAvailable).toBe(false);
    expect(fp?.genres).toEqual([]);
  });

  it("agrupa las décadas por año de edición más temprano", async () => {
    mocks.getProfileByUsername.mockResolvedValue(followerProfile);
    rowsByTable.rating = [{ id: "rg1", stars: "4", n: 2, artists: 0, albums: 2, songs: 0 }];
    rowsByTable.release = [{ decade: 1970 }, { decade: 1970 }, { decade: 1990 }];

    const fp = await getTasteFingerprint("ana", "viewer");
    expect(fp?.decades).toEqual([
      { label: "1970s", count: 2 },
      { label: "1990s", count: 1 },
    ]);
  });

  describe("summary (spec taste-fingerprint, 'Resumen cualitativo para los niveles 1 y 2')", () => {
    it("sin datos suficientes, el resumen queda vacío", async () => {
      mocks.getProfileByUsername.mockResolvedValue(followerProfile);
      const fp = await getTasteFingerprint("ana", "viewer");
      expect(fp?.summary).toEqual([]);
    });

    it("deriva hasta 3 frases (década, género, patrón de calificación) de los mismos datos ya calculados", async () => {
      mocks.getProfileByUsername.mockResolvedValue(followerProfile);
      rowsByTable.rating = [{ id: "rg1", stars: "5", n: 4, artists: 0, albums: 1, songs: 0 }];
      rowsByTable.release = [{ decade: 2010 }, { decade: 2010 }];
      rowsByTable.release_group_tag = [{ tag: "pop", total: 3 }];

      const fp = await getTasteFingerprint("ana", "viewer");
      expect(fp?.summary).toHaveLength(3);
      expect(fp?.summary).toEqual(
        expect.arrayContaining([
          expect.stringContaining("2010s"),
          expect.stringContaining("pop"),
        ]),
      );
    });

    it("nunca expone el promedio numérico de estrellas, solo un patrón cualitativo", async () => {
      mocks.getProfileByUsername.mockResolvedValue(followerProfile);
      rowsByTable.rating = [{ stars: "5", n: 4, artists: 0, albums: 1, songs: 0 }];

      const fp = await getTasteFingerprint("ana", "viewer");
      const ratingPhrase = fp?.summary.find((s) => !s.includes("década") && !s.includes("género"));
      expect(ratingPhrase).toBeDefined();
      expect(ratingPhrase).not.toMatch(/\d/);
    });

    it("sin valoraciones visibles para el visitante, no hay frase de patrón de calificación", async () => {
      mocks.getProfileByUsername.mockResolvedValue({ ...followerProfile, relation: "none" });
      rowsByTable.rating = [{ stars: "5", n: 4 }]; // no visible: relation "none", se ignora
      rowsByTable.favorite = [{ id: "rg1" }]; // sí visible (audience pública): alimenta décadas
      rowsByTable.release = [{ decade: 1990 }];

      const fp = await getTasteFingerprint("ana", null);
      expect(fp?.summary).toEqual(["Escucha sobre todo música de los 1990s"]);
    });
  });
});
