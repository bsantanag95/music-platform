import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { listProfileFollowedArtists } from "./exploration";

const mocks = vi.hoisted(() => ({ select: vi.fn(), getProfileByUsername: vi.fn() }));

vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: mocks.getProfileByUsername,
}));

// `artist_follow` recibe dos consultas por llamada (filas de la página +
// conteo total) — cola posicional, mismo patrón que `affinity.test.ts` para
// `mutualFollowersHint`. Cualquier otra tabla usa el mock keyed simple.
let artistFollowQueue: unknown[][] = [];
const rowsByTable: Record<string, unknown[]> = {};

function chainFor() {
  let table = "";
  const resolved = () => {
    if (table === "artist_follow") return Promise.resolve(artistFollowQueue.shift() ?? []);
    return Promise.resolve(rowsByTable[table] ?? []);
  };
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
        if (prop === "then" || prop === "catch" || prop === "finally") {
          const p = resolved();
          return (p[prop] as (...args: unknown[]) => unknown).bind(p);
        }
        return () => step;
      },
    },
  );
  return step;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(rowsByTable)) delete rowsByTable[k];
  artistFollowQueue = [];
  mocks.select.mockImplementation(() => chainFor());
});

describe("listProfileFollowedArtists", () => {
  it("devuelve vacío sin consultar la DB cuando el perfil no es accesible", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: "owner", accessible: false });
    await expect(listProfileFollowedArtists("ana", "viewer")).resolves.toEqual({
      artists: [],
      totalCount: 0,
      page: 1,
      pageSize: 8,
      hasNext: false,
    });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("devuelve los artistas seguidos del dueño y el total cuando es accesible", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: "owner", accessible: true });
    artistFollowQueue = [
      [{ id: "a1", name: "Radiohead", type: "group", photoUrl: null }],
      [{ count: 1 }],
    ];
    await expect(listProfileFollowedArtists("ana", "viewer")).resolves.toEqual({
      artists: [{ id: "a1", name: "Radiohead", type: "group", photoUrl: null }],
      totalCount: 1,
      page: 1,
      pageSize: 8,
      hasNext: false,
    });
  });

  it("hasNext es true cuando el total supera la página pedida", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: "owner", accessible: true });
    artistFollowQueue = [
      [{ id: "a1", name: "Radiohead", type: "group", photoUrl: null }],
      [{ count: 9 }],
    ];
    const page = await listProfileFollowedArtists("ana", "viewer", 1, 8);
    expect(page.totalCount).toBe(9);
    expect(page.hasNext).toBe(true);
  });

  it("pageSize inválido lanza VALIDATION_ERROR", async () => {
    await expect(listProfileFollowedArtists("ana", "viewer", 1, 51)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mocks.getProfileByUsername).not.toHaveBeenCalled();
  });
});
