import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { getProfileAffinity, mutualFollowersHint } from "./affinity";

const rowsByTable: Record<string, unknown[]> = {};
const mocks = vi.hoisted(() => ({ select: vi.fn(), getProfileByUsername: vi.fn() }));

vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/services/feed/feed", () => ({ PRIMARY_ARTIST_SQL: () => ({}) }));
vi.mock("@/services/social/profiles", () => ({ getProfileByUsername: mocks.getProfileByUsername }));

// Cadena keyed por tabla, salvo user_follow que necesita respuestas
// posicionales (mutualFollowersHint hace dos selects sobre la misma tabla).
let followQueue: unknown[][] = [];

function chain() {
  let table = "";
  const result = () => {
    if (table === "user_follow") return Promise.resolve(followQueue.shift() ?? []);
    return Promise.resolve(rowsByTable[table] ?? []);
  };
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "from") {
          return (t: unknown) => {
            table = getTableName(t as Parameters<typeof getTableName>[0]);
            return proxy;
          };
        }
        if (prop === "then" || prop === "catch" || prop === "finally") {
          const p = result();
          return (p[prop as "then"] as (...a: unknown[]) => unknown).bind(p);
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rowsByTable)) delete rowsByTable[key];
  followQueue = [];
  mocks.select.mockImplementation(() => chain());
});

describe("mutualFollowersHint", () => {
  it("cuenta los seguidores del dueño que el visitante también sigue", async () => {
    followQueue = [[{ id: "a" }, { id: "b" }, { id: "c" }], [{ count: 3 }]];
    await expect(mutualFollowersHint("viewer", "owner")).resolves.toBe(3);
  });

  it("devuelve 0 si el visitante no sigue a nadie", async () => {
    followQueue = [[]];
    await expect(mutualFollowersHint("viewer", "owner")).resolves.toBe(0);
  });

  it("devuelve 0 cuando el visitante es el propio dueño", async () => {
    await expect(mutualFollowersHint("same", "same")).resolves.toBe(0);
    expect(mocks.select).not.toHaveBeenCalled();
  });
});

describe("getProfileAffinity", () => {
  const accessible = {
    id: "owner",
    profileVisibility: "public",
    relation: "following",
    blockedByMe: false,
    accessible: true,
  };

  it("null sin sesión", async () => {
    await expect(getProfileAffinity("ana", null)).resolves.toBeNull();
  });

  it("null para el propio dueño", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...accessible, relation: "self" });
    await expect(getProfileAffinity("ana", "viewer")).resolves.toBeNull();
  });

  it("null ante bloqueo", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...accessible, blockedByMe: true });
    await expect(getProfileAffinity("ana", "viewer")).resolves.toBeNull();
  });

  it("null cuando no hay ninguna coincidencia", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessible);
    rowsByTable.favorite = [];
    rowsByTable.rating = [];
    followQueue = [[]]; // el visitante no sigue a nadie
    await expect(getProfileAffinity("ana", "viewer")).resolves.toBeNull();
  });

  it("devuelve favoritos en común resueltos", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessible);
    // Ambos lados consultan `favorite`; con el mock keyed por tabla ambos
    // reciben las mismas filas → intersección = esas filas.
    rowsByTable.favorite = [
      { artistId: null, releaseGroupId: "rg1", recordingId: null },
    ];
    rowsByTable.rating = [];
    rowsByTable.release_group = [{ id: "rg1", title: "Souvlaki", cover: null, credited: "Slowdive" }];
    followQueue = [[]];

    const affinity = await getProfileAffinity("ana", "viewer");
    expect(affinity?.sharedFavorites).toEqual([
      { type: "release-group", id: "rg1", title: "Souvlaki", artistName: "Slowdive", coverThumbUrl: null },
    ]);
  });

  it("muestra la afinidad cuando solo coinciden los artistas seguidos", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessible);
    rowsByTable.favorite = [];
    rowsByTable.rating = [];
    followQueue = [[]]; // sin seguidores en común
    // Ambos lados consultan `artist_follow` con el mock keyed por tabla →
    // mismas filas → intersección = esos artistas.
    rowsByTable.artist_follow = [{ id: "a1" }];
    rowsByTable.artist = [{ id: "a1", name: "Radiohead" }];

    const affinity = await getProfileAffinity("ana", "viewer");
    expect(affinity?.sharedFollowedArtists).toEqual([
      { type: "artist", id: "a1", title: "Radiohead", artistName: null, coverThumbUrl: null },
    ]);
  });
});
