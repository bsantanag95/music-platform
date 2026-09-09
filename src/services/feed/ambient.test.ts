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

function artistRow(over: Record<string, unknown> = {}) {
  return {
    authorId: "f1",
    authorUsername: "ana",
    authorDisplayName: "Ana",
    artistId: "art1",
    artistName: "Radiohead",
    at: new Date("2026-09-08T00:00:00Z"),
    ...over,
  };
}

function userRow(over: Record<string, unknown> = {}) {
  return {
    authorId: "f1",
    authorUsername: "ana",
    authorDisplayName: "Ana",
    followedId: "t1",
    followedUsername: "beto",
    followedDisplayName: "Beto",
    followedVisibility: "public",
    at: new Date("2026-09-07T00:00:00Z"),
    ...over,
  };
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

// followRows, blockRows, luego artistRows, userRows, collectionRows (Promise.all).
function primeDb(opts: {
  follows: string[];
  blocks?: { blockerId: string; blockedId: string }[];
  artists?: unknown[];
  users?: unknown[];
  collection?: unknown[];
}) {
  mocks.db.select.mockReturnValueOnce(q(opts.follows.map((id) => ({ id }))));
  if (opts.follows.length === 0) return;
  mocks.db.select.mockReturnValueOnce(q(opts.blocks ?? []));
  mocks.db.select
    .mockReturnValueOnce(q(opts.artists ?? []))
    .mockReturnValueOnce(q(opts.users ?? []))
    .mockReturnValueOnce(q(opts.collection ?? []));
}

describe("getFeedAmbientEvents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve grupos vacíos cuando el lector no sigue a nadie", async () => {
    primeDb({ follows: [] });
    expect(await getFeedAmbientEvents(viewer)).toEqual({ groups: [] });
  });

  it("agrupa los follows de artista de una persona en un solo grupo, con la muestra acotada", async () => {
    primeDb({
      follows: ["f1"],
      artists: [
        artistRow({ artistId: "a1", artistName: "Uno", at: new Date("2026-09-08T04:00:00Z") }),
        artistRow({ artistId: "a2", artistName: "Dos", at: new Date("2026-09-08T03:00:00Z") }),
        artistRow({ artistId: "a3", artistName: "Tres", at: new Date("2026-09-08T02:00:00Z") }),
        artistRow({ artistId: "a4", artistName: "Cuatro", at: new Date("2026-09-08T01:00:00Z") }),
      ],
    });

    const { groups } = await getFeedAmbientEvents(viewer);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: "follow-artist", count: 4, author: { username: "ana" } });
    expect(groups[0]!.sample).toHaveLength(AMBIENT_SAMPLE);
    expect(groups[0]!.sample.map((i) => i.label)).toEqual(["Uno", "Dos", "Tres"]);
    expect(groups[0]!.sample[0]!.href).toBe("/artist/a1");
  });

  it("incluye un follow a perfil público y excluye uno a perfil privado no seguido, el propio lector y los bloqueados", async () => {
    primeDb({
      follows: ["f1", "seguido-privado"],
      blocks: [{ blockerId: viewer, blockedId: "bloqueado" }],
      users: [
        userRow({ followedId: "publico", followedUsername: "pub", followedDisplayName: null, followedVisibility: "public" }),
        userRow({ followedId: "priv", followedUsername: "priv", followedDisplayName: null, followedVisibility: "private" }),
        userRow({ followedId: "seguido-privado", followedUsername: "sp", followedDisplayName: null, followedVisibility: "private" }),
        userRow({ followedId: viewer, followedUsername: "yo", followedDisplayName: null, followedVisibility: "public" }),
        userRow({ followedId: "bloqueado", followedUsername: "blk", followedDisplayName: null, followedVisibility: "public" }),
      ],
    });

    const { groups } = await getFeedAmbientEvents(viewer);

    const labels = groups[0]!.sample.map((i) => i.label);
    // "pub" (público) y "sp" (privado pero el lector lo sigue) sí; "priv", el
    // propio lector y "blk" no.
    expect(groups[0]!.count).toBe(2);
    expect(labels).toEqual(expect.arrayContaining(["@pub", "@sp"]));
    expect(labels).not.toContain("@priv");
    expect(labels).not.toContain("@yo");
    expect(labels).not.toContain("@blk");
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

  it("mezcla los tres tipos, un grupo por autor y tipo", async () => {
    primeDb({
      follows: ["f1", "f2"],
      artists: [artistRow()],
      users: [userRow()],
      collection: [collectionRow()],
    });

    const { groups } = await getFeedAmbientEvents(viewer);

    expect(groups.map((g) => g.kind).sort()).toEqual(["collection", "follow-artist", "follow-user"]);
  });
});
