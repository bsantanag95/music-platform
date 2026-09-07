import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { getProfileRecency } from "./recency";

const rowsByTable: Record<string, unknown[]> = {};
const mocks = vi.hoisted(() => ({ select: vi.fn(), getProfileByUsername: vi.fn() }));

vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/services/social/profiles", () => ({ getProfileByUsername: mocks.getProfileByUsername }));

function chainFor() {
  let table = "";
  const resolved = () => Promise.resolve(rowsByTable[table] ?? [{ t: null }]);
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "from") {
          return (t: unknown) => {
            table = getTableName(t as Parameters<typeof getTableName>[0]);
            return chainProxy;
          };
        }
        if (prop === "then") return resolved().then.bind(resolved());
        if (prop === "catch") return resolved().catch.bind(resolved());
        if (prop === "finally") return resolved().finally.bind(resolved());
        return () => chainProxy;
      },
    },
  );
}
let chainProxy: unknown;

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rowsByTable)) delete rowsByTable[key];
  mocks.select.mockImplementation(() => {
    chainProxy = chainFor();
    return chainProxy;
  });
});

describe("getProfileRecency", () => {
  it("null cuando el perfil no es accesible", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "o",
      profileVisibility: "private",
      relation: "none",
      blockedByMe: false,
      accessible: false,
    });
    await expect(getProfileRecency("ana", "v")).resolves.toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("devuelve la fecha más reciente entre las fuentes visibles", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "o",
      profileVisibility: "public",
      relation: "following",
      blockedByMe: false,
      accessible: true,
    });
    rowsByTable.listen_entry = [{ t: new Date("2026-01-01T00:00:00Z") }];
    rowsByTable.favorite = [{ t: new Date("2026-03-15T00:00:00Z") }];
    rowsByTable.rating = [{ t: new Date("2026-02-01T00:00:00Z") }];

    const at = await getProfileRecency("ana", "v");
    expect(at?.toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });
});
