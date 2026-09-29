import { beforeEach, describe, expect, it, vi } from "vitest";

// Cola de resultados: cada consulta toma el siguiente, en el orden en que se arma.
const queue = vi.hoisted(() => ({ results: [] as unknown[][], calls: 0 }));

vi.mock("@/db", () => {
  const chain = (result: unknown[]) => {
    const node: Record<string, unknown> = {};
    for (const method of ["from", "innerJoin", "where", "orderBy"]) node[method] = () => node;
    node.then = (resolve: (value: unknown) => void) => resolve(result);
    return node;
  };
  const next = () => {
    queue.calls += 1;
    return chain(queue.results.shift() ?? []);
  };
  return { db: { select: next, selectDistinct: next } };
});

const { getDiscographyMarks, EMPTY_DISCOGRAPHY_MARKS } = await import("./artist-discography-view");

beforeEach(() => {
  queue.results = [];
  queue.calls = 0;
});

describe("getDiscographyMarks", () => {
  it("precarga escuchas, notas, puntaje, favoritos, Pendiente y listas en una consulta por tabla", async () => {
    queue.results = [
      [{ releaseGroupId: "dsotm" }, { releaseGroupId: null }],
      [
        { releaseGroupId: "dsotm", stars: "4.5", detailedScore: 92 },
        { releaseGroupId: "wall", stars: "3.0", detailedScore: null },
      ],
      [{ releaseGroupId: "wall" }],
      [{ releaseGroupId: "animals" }],
      [
        { releaseGroupId: "dsotm", listId: "l1", itemId: "i1", kind: "standard", title: "Favoritas" },
        { releaseGroupId: "dsotm", listId: "c1", itemId: "i2", kind: "custom_journey", title: "Mi camino" },
        { releaseGroupId: "wall", listId: "l1", itemId: "i3", kind: "standard", title: "Favoritas" },
      ],
    ];

    const marks = await getDiscographyMarks("u1", ["dsotm", "wall", "animals"]);

    expect(queue.calls).toBe(5);
    expect(marks).toEqual({
      listened: ["dsotm"],
      stars: { dsotm: 4.5, wall: 3 },
      detailedScores: { dsotm: 92 },
      favorites: ["wall"],
      pending: ["animals"],
      lists: {
        dsotm: [
          { listId: "l1", itemId: "i1", kind: "standard", title: "Favoritas" },
          { listId: "c1", itemId: "i2", kind: "custom_journey", title: "Mi camino" },
        ],
        wall: [{ listId: "l1", itemId: "i3", kind: "standard", title: "Favoritas" }],
      },
    });
  });

  it("sin discos no consulta la base", async () => {
    expect(await getDiscographyMarks("u1", [])).toEqual(EMPTY_DISCOGRAPHY_MARKS);
    expect(queue.calls).toBe(0);
  });
});
