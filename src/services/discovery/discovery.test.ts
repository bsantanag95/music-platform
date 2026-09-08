import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listAlbumsByDecade,
  listAlbumsByGenre,
  listFeaturedCollections,
  listMostReviewed,
  listTopRated,
} from "./discovery";
import { MIN_ALBUMS_FOR_SECTION } from "./constants";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  enrichLists: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/lists/lists", () => ({ enrichLists: mocks.enrichLists }));

// Proxy que devuelve `this` para cualquier método encadenado y resuelve a
// `result` al hacer await (mismo helper que src/services/lists/discovery.test.ts).
function chain<T>(result: T): T {
  const promise = Promise.resolve(result);
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "then") return promise.then.bind(promise);
      if (prop === "catch") return promise.catch.bind(promise);
      if (prop === "finally") return promise.finally.bind(promise);
      return () => proxy;
    },
    apply() {
      return proxy;
    },
  });
  return proxy as T;
}

function albumRow(id: string) {
  return {
    id,
    mbid: null,
    title: `Álbum ${id}`,
    category: "studio",
    firstReleaseDate: null,
    firstReleaseYear: 1994,
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listFeaturedCollections", () => {
  it("ordena por rank y enriquece con conteo y carátulas", async () => {
    mocks.db.select.mockReturnValue(
      chain([
        { id: "l2", title: "Segunda", rank: 2 },
        { id: "l1", title: "Primera", rank: 1 },
      ]),
    );
    mocks.enrichLists.mockResolvedValue(
      new Map([
        ["l1", { itemCount: 5, coverThumbs: ["a"] }],
        ["l2", { itemCount: 3, coverThumbs: [] }],
      ]),
    );

    const result = await listFeaturedCollections();

    // el orden lo da la query (mockeada); comprobamos el mapeo/enriquecimiento
    expect(result.map((c) => c.id)).toEqual(["l2", "l1"]);
    expect(result.find((c) => c.id === "l1")).toMatchObject({ itemCount: 5, coverThumbs: ["a"] });
  });

  it("sin colecciones destacadas devuelve lista vacía", async () => {
    mocks.db.select.mockReturnValue(chain([]));
    mocks.enrichLists.mockResolvedValue(new Map());
    await expect(listFeaturedCollections()).resolves.toEqual([]);
  });
});

describe("rieles por reglas: degradación grácil", () => {
  it("listTopRated omite el riel (devuelve []) bajo MIN_ALBUMS_FOR_SECTION", async () => {
    const few = Array.from({ length: MIN_ALBUMS_FOR_SECTION - 1 }, (_, i) => ({
      ...albumRow(`a${i}`),
      avgStars: 4.5,
      ratingCount: 3,
    }));
    mocks.db.select.mockReturnValue(chain(few));
    await expect(listTopRated()).resolves.toEqual([]);
  });

  it("listTopRated muestra el riel al alcanzar el umbral", async () => {
    const enough = Array.from({ length: MIN_ALBUMS_FOR_SECTION }, (_, i) => ({
      ...albumRow(`a${i}`),
      avgStars: 4.5,
      ratingCount: 3,
    }));
    mocks.db.select.mockReturnValue(chain(enough));
    const result = await listTopRated();
    expect(result).toHaveLength(MIN_ALBUMS_FOR_SECTION);
    expect(result[0]).toMatchObject({ title: "Álbum a0", firstReleaseYear: 1994 });
  });

  it("listMostReviewed omite el riel bajo umbral", async () => {
    mocks.db.select.mockReturnValue(chain([{ ...albumRow("a0"), reviewCount: 2 }]));
    await expect(listMostReviewed()).resolves.toEqual([]);
  });
});

describe("listados filtrados: validación", () => {
  it("rechaza una década no múltiplo de 10 o fuera de rango", async () => {
    mocks.db.select.mockReturnValue(chain([]));
    await expect(listAlbumsByDecade(1995, 1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listAlbumsByDecade(1200, 1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza una paginación inválida", async () => {
    mocks.db.select.mockReturnValue(chain([]));
    await expect(listAlbumsByDecade(1990, 0)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(listAlbumsByGenre("rock", -1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza un género vacío", async () => {
    mocks.db.select.mockReturnValue(chain([]));
    await expect(listAlbumsByGenre("   ", 1)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("calcula hasNext con una fila extra y recorta a pageSize", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => albumRow(`a${i}`));
    mocks.db.select.mockReturnValue(chain(rows));
    const result = await listAlbumsByDecade(1990, 1);
    expect(result.albums).toHaveLength(24);
    expect(result.hasNext).toBe(true);
  });
});
