import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { listProfileFollowedArtists } from "./exploration";

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

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(rowsByTable)) delete rowsByTable[k];
  mocks.select.mockImplementation(() => chainFor());
});

describe("listProfileFollowedArtists", () => {
  it("devuelve [] cuando el perfil no es accesible", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: "owner", accessible: false });
    await expect(listProfileFollowedArtists("ana", "viewer")).resolves.toEqual([]);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("devuelve los artistas seguidos del dueño cuando es accesible", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: "owner", accessible: true });
    rowsByTable.artist_follow = [
      { id: "a1", name: "Radiohead", type: "group", photoUrl: null },
    ];
    await expect(listProfileFollowedArtists("ana", "viewer")).resolves.toEqual([
      { id: "a1", name: "Radiohead", type: "group", photoUrl: null },
    ]);
  });
});
