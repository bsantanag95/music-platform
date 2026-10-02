import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));

import { genreIdsForQids, orderSeedGenres, replaceArtistGenreSeeds } from "./seeds";

describe("orderSeedGenres", () => {
  it("respeta el orden de Wikidata y descarta los QIDs sin género", () => {
    const rows = [
      { genreId: "g-dream", wikidataId: "Q1129034" },
      { genreId: "g-shoegaze", wikidataId: "Q484641" },
    ];
    expect(orderSeedGenres(["Q484641", "Q-sin-genero", "Q1129034"], rows)).toEqual(["g-shoegaze", "g-dream"]);
  });

  it("si dos géneros comparten QID entran los dos, sin repetir", () => {
    const rows = [
      { genreId: "g-b", wikidataId: "Q1" },
      { genreId: "g-a", wikidataId: "Q1" },
    ];
    expect(orderSeedGenres(["Q1", "Q1"], rows)).toEqual(["g-a", "g-b"]);
  });
});

// Ejecutor falso que registra las escrituras; la consulta a `genre` devuelve filas fijas.
function fakeExecutor(rows: { genreId: string; wikidataId: string | null }[]) {
  const writes: { op: string; values?: unknown }[] = [];
  const executor = {
    select: () => ({ from: () => ({ where: async () => rows }) }),
    delete: () => ({ where: async () => writes.push({ op: "delete" }) }),
    insert: () => ({ values: async (values: unknown) => writes.push({ op: "insert", values }) }),
  };
  return { executor: executor as never, writes };
}

describe("semillas", () => {
  it("sin QIDs no consulta la taxonomía", async () => {
    const { executor } = fakeExecutor([]);
    await expect(genreIdsForQids(executor, [])).resolves.toEqual([]);
  });

  it("reemplaza las semillas del artista con sus posiciones", async () => {
    const { executor, writes } = fakeExecutor([
      { genreId: "g-shoegaze", wikidataId: "Q484641" },
      { genreId: "g-dream", wikidataId: "Q1129034" },
    ]);
    await expect(replaceArtistGenreSeeds(executor, "a1", ["Q1129034", "Q484641"])).resolves.toBe(2);
    expect(writes).toEqual([
      { op: "delete" },
      {
        op: "insert",
        values: [
          { artistId: "a1", genreId: "g-dream", position: 0 },
          { artistId: "a1", genreId: "g-shoegaze", position: 1 },
        ],
      },
    ]);
  });

  it("sin géneros traducibles borra las semillas y no inserta nada", async () => {
    const { executor, writes } = fakeExecutor([]);
    await expect(replaceArtistGenreSeeds(executor, "a1", ["Q-sin-genero"])).resolves.toBe(0);
    expect(writes).toEqual([{ op: "delete" }]);
  });
});
