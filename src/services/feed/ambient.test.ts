import { describe, expect, it, vi, beforeEach } from "vitest";
import { AMBIENT_MAX_GROUPS, AMBIENT_SAMPLE, getFeedAmbientEvents } from "./ambient";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

const viewer = "00000000-0000-4000-8000-000000000001";

// `.from(t).where(cond)` y `.from(t).innerJoin(...).innerJoin(...).where(cond)`
// son thenables en drizzle — el mock resuelve al array de filas.
function q(rows: unknown[]) {
  const chain = {
    innerJoin: () => chain,
    where: () => Promise.resolve(rows),
  };
  return { from: () => chain };
}

function collectionRow(over: Record<string, unknown> = {}) {
  return {
    authorId: "f2",
    authorUsername: "leo",
    authorDisplayName: "Leo",
    releaseGroupId: "rg1",
    releaseTitle: "Rumours",
    at: new Date("2026-09-06T00:00:00Z"),
    ...over,
  };
}

// followRows, blockRows, luego collectionRows. "Seguir usuario" y "seguir
// artista" ya no son fuente de este cálculo (openspec:
// add-feed-kind-differentiation, add-artist-follow-feed-entry).
function primeDb(opts: {
  follows: string[];
  blocks?: { blockerId: string; blockedId: string }[];
  collection?: unknown[];
}) {
  mocks.db.select.mockReturnValueOnce(q(opts.follows.map((id) => ({ id }))));
  if (opts.follows.length === 0) return;
  mocks.db.select.mockReturnValueOnce(q(opts.blocks ?? []));
  mocks.db.select.mockReturnValueOnce(q(opts.collection ?? []));
}

describe("getFeedAmbientEvents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve grupos vacíos cuando el lector no sigue a nadie", async () => {
    primeDb({ follows: [] });
    expect(await getFeedAmbientEvents(viewer)).toEqual({ groups: [] });
  });

  it("agrupa las altas de colección de una persona en un solo grupo, con la muestra acotada", async () => {
    primeDb({
      follows: ["f2"],
      collection: [
        collectionRow({ releaseGroupId: "rg1", releaseTitle: "Uno", at: new Date("2026-09-08T04:00:00Z") }),
        collectionRow({ releaseGroupId: "rg2", releaseTitle: "Dos", at: new Date("2026-09-08T03:00:00Z") }),
        collectionRow({ releaseGroupId: "rg3", releaseTitle: "Tres", at: new Date("2026-09-08T02:00:00Z") }),
        collectionRow({ releaseGroupId: "rg4", releaseTitle: "Cuatro", at: new Date("2026-09-08T01:00:00Z") }),
      ],
    });

    const { groups } = await getFeedAmbientEvents(viewer);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: "collection", count: 4, author: { username: "leo" } });
    expect(groups[0]!.sample).toHaveLength(AMBIENT_SAMPLE);
    expect(groups[0]!.sample.map((i) => i.label)).toEqual(["Uno", "Dos", "Tres"]);
    expect(groups[0]!.sample[0]!.href).toBe("/album/rg1");
  });

  it("ordena los grupos por fecha del ítem más reciente y corta a AMBIENT_MAX_GROUPS", async () => {
    const many = Array.from({ length: AMBIENT_MAX_GROUPS + 3 }, (_, i) =>
      collectionRow({
        authorId: `c${i}`,
        authorUsername: `u${i}`,
        releaseGroupId: `rg${i}`,
        releaseTitle: `Disco ${i}`,
        at: new Date(Date.UTC(2026, 8, 1 + i)),
      }),
    );
    primeDb({ follows: ["f1"], collection: many });

    const { groups } = await getFeedAmbientEvents(viewer);

    expect(groups).toHaveLength(AMBIENT_MAX_GROUPS);
    // el más reciente primero
    expect(groups[0]!.sample[0]!.label).toBe(`Disco ${AMBIENT_MAX_GROUPS + 2}`);
  });

  it("produce un grupo por autor, sin mezclar autores distintos", async () => {
    primeDb({
      follows: ["f1", "f2"],
      collection: [
        collectionRow({ authorId: "f1", authorUsername: "ana", releaseGroupId: "rgA" }),
        collectionRow({ authorId: "f2", authorUsername: "leo", releaseGroupId: "rgB" }),
      ],
    });

    const { groups } = await getFeedAmbientEvents(viewer);

    expect(groups.map((g) => g.author.username).sort()).toEqual(["ana", "leo"]);
    expect(groups.every((g) => g.kind === "collection")).toBe(true);
  });
});
