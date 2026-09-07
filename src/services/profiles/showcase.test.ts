import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { getShowcase, replacePinned, setAnthem } from "./showcase";

// Mock de db agnóstico a la forma de la cadena, keyed por tabla (mismo patrón
// que stats.test.ts).
const rowsByTable: Record<string, unknown[]> = {};

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  insert: vi.fn(),
  deleteFn: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: mocks.select,
    transaction: mocks.transaction,
    insert: mocks.insert,
    delete: mocks.deleteFn,
  },
}));
vi.mock("@/services/feed/feed", () => ({ PRIMARY_ARTIST_SQL: () => ({}) }));

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

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rowsByTable)) delete rowsByTable[key];
  mocks.select.mockImplementation(() => chainFor());
});

describe("replacePinned", () => {
  it("rechaza más de 4 destacados", async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      type: "artist" as const,
      id: `a${i}`,
    }));
    await expectCode(replacePinned("u1", items), "VALIDATION_ERROR");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rechaza una nota de más de 120 caracteres", async () => {
    await expectCode(
      replacePinned("u1", [{ type: "release-group", id: "rg1", note: "x".repeat(121) }]),
      "VALIDATION_ERROR",
    );
  });

  it("traduce una violación de FK a VALIDATION_ERROR", async () => {
    mocks.transaction.mockRejectedValue({ code: "23503" });
    await expectCode(
      replacePinned("u1", [{ type: "artist", id: "no-existe" }]),
      "VALIDATION_ERROR",
    );
  });
});

describe("getShowcase", () => {
  it("omite los destacados cuya entidad ya no existe", async () => {
    rowsByTable.user_pinned_item = [
      {
        id: "p1",
        note: null,
        position: 0,
        artistId: "a1",
        releaseGroupId: null,
        recordingId: null,
        artistName: "Slowdive",
      },
      {
        id: "p2",
        note: null,
        position: 1,
        artistId: "a2",
        releaseGroupId: null,
        recordingId: null,
        artistName: null, // entidad borrada
      },
    ];
    rowsByTable.user_showcase = [];

    const showcase = await getShowcase("u1");
    expect(showcase.pinned).toHaveLength(1);
    expect(showcase.pinned[0]!.entity.title).toBe("Slowdive");
    expect(showcase.anthem).toBeNull();
  });
});

describe("setAnthem", () => {
  it("traduce una FK inválida a VALIDATION_ERROR", async () => {
    const onConflictDoUpdate = vi.fn().mockRejectedValue({ code: "23503" });
    mocks.insert.mockReturnValue({ values: () => ({ onConflictDoUpdate }) });
    await expectCode(setAnthem("u1", "no-existe"), "VALIDATION_ERROR");
  });

  it("no lee escuchas (himno independiente de la última escucha)", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    mocks.insert.mockReturnValue({ values: () => ({ onConflictDoUpdate }) });
    await setAnthem("u1", "rec1");
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
