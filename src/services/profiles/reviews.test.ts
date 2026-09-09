import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { getProfileReviews } from "./reviews";

// Mock de db agnóstico a la forma de la cadena (mismo patrón que
// in-rotation.test.ts): el terminal awaitable resuelve a
// `rowsByTable[<nombre de la primera tabla del from>]`.
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

const publicProfile = {
  id: "owner",
  username: "ana",
  profileVisibility: "public" as const,
  relation: "following" as const,
  blockedByMe: false,
  accessible: true,
};

function reviewRow(over: Record<string, unknown> = {}) {
  return {
    id: "rv1",
    title: "Un disco para volver",
    body: "La producción respira y cada tema encuentra su lugar sin apuro.",
    updatedAt: new Date("2026-09-08T00:00:00Z"),
    albumId: "rg1",
    albumTitle: "A Moon Shaped Pool",
    albumCover: "https://cover/1.jpg",
    artistName: "Radiohead",
    stars: "4.5",
    detailedScore: 88,
    total: 1,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rowsByTable)) delete rowsByTable[key];
  mocks.select.mockImplementation(() => chainFor());
  mocks.getProfileByUsername.mockResolvedValue(publicProfile);
});

describe("getProfileReviews", () => {
  it("devuelve null cuando el perfil no es accesible, sin consultar", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      ...publicProfile,
      accessible: false,
      relation: "none",
    });

    await expect(getProfileReviews("ana", "viewer")).resolves.toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("devuelve null cuando el dueño no tiene reseñas", async () => {
    rowsByTable.review = [];
    await expect(getProfileReviews("ana", "viewer")).resolves.toBeNull();
  });

  it("mapea las reseñas con álbum, artista, rating y fecha de última edición en ISO", async () => {
    rowsByTable.review = [reviewRow()];

    const result = await getProfileReviews("ana", "viewer");

    expect(result).not.toBeNull();
    expect(result!.reviews).toHaveLength(1);
    expect(result!.reviews[0]).toMatchObject({
      id: "rv1",
      title: "Un disco para volver",
      stars: "4.5",
      detailedScore: 88,
      updatedAt: "2026-09-08T00:00:00.000Z",
      album: {
        id: "rg1",
        title: "A Moon Shaped Pool",
        artistName: "Radiohead",
        coverThumbUrl: "https://cover/1.jpg",
      },
    });
  });

  it("expone el recuento total de la ventana (para 'y N más')", async () => {
    rowsByTable.review = [
      reviewRow({ id: "a", total: 9 }),
      reviewRow({ id: "b", total: 9 }),
    ];

    const result = await getProfileReviews("ana", "viewer");

    expect(result!.total).toBe(9);
    expect(result!.reviews.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("tolera una reseña sin rating asociado", async () => {
    rowsByTable.review = [reviewRow({ stars: null, detailedScore: null })];

    const result = await getProfileReviews("ana", "viewer");

    expect(result!.reviews[0]!.stars).toBeNull();
    expect(result!.reviews[0]!.detailedScore).toBeNull();
  });
});
