import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { completeOnboarding, seedFavoriteAlbums } from "./onboarding";

const rowsByTable: Record<string, unknown[]> = {};

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  values: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: { select: mocks.select, insert: mocks.insert, update: mocks.update },
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

const RG = (n: number) => `rg-${n}`;
const USER = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(rowsByTable)) delete rowsByTable[k];
  mocks.select.mockImplementation(() => chainFor());
  mocks.values.mockResolvedValue(undefined);
  mocks.insert.mockReturnValue({ values: mocks.values });
  mocks.update.mockReturnValue({ set: () => ({ where: async () => undefined }) });
});

describe("seedFavoriteAlbums", () => {
  it("con lista vacía no toca la base", async () => {
    await seedFavoriteAlbums(USER, []);
    expect(mocks.select).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rechaza más de 6 álbumes", async () => {
    await expect(
      seedFavoriteAlbums(USER, [RG(1), RG(2), RG(3), RG(4), RG(5), RG(6), RG(7)]),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rechaza ids duplicados", async () => {
    await expect(seedFavoriteAlbums(USER, [RG(1), RG(1)])).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rechaza un release-group inexistente", async () => {
    rowsByTable.release_group = [{ id: RG(1) }]; // se pidieron RG1 y RG2
    await expect(seedFavoriteAlbums(USER, [RG(1), RG(2)])).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("crea solo los favoritos que faltan, sin fijar ni ordenar", async () => {
    rowsByTable.release_group = [{ id: RG(1) }, { id: RG(2) }];
    rowsByTable.favorite = [{ releaseGroupId: RG(1) }]; // RG1 ya favorito, RG2 no

    await seedFavoriteAlbums(USER, [RG(2), RG(1)]);

    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.values).toHaveBeenCalledWith([{ userId: USER, releaseGroupId: RG(2) }]);
  });

  it("no crea nada si todos los álbumes ya eran favoritos", async () => {
    rowsByTable.release_group = [{ id: RG(1) }];
    rowsByTable.favorite = [{ releaseGroupId: RG(1) }];

    await seedFavoriteAlbums(USER, [RG(1)]);

    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("no toca la tabla de valoración ni los pines de álbum", () => {
    const src = readFileSync(
      join(process.cwd(), "src/services/onboarding/onboarding.ts"),
      "utf8",
    );
    const schemaImports = src.match(/import\s*\{([^}]*)\}\s*from\s*"@\/db\/schema"/)?.[1] ?? "";
    const ids = schemaImports.split(",").map((p) => p.trim().split(/\s+as\s+/)[0]);
    expect(ids).not.toContain("rating");
    expect(ids).not.toContain("userAlbumPin");
  });
});

describe("completeOnboarding", () => {
  it("crea los favoritos y marca cuando el usuario está pendiente", async () => {
    rowsByTable.app_user = [{ onboardedAt: null }];
    rowsByTable.release_group = [{ id: RG(1) }];
    rowsByTable.favorite = [];

    const state = await completeOnboarding(USER, [RG(1)]);

    expect(mocks.values).toHaveBeenCalledWith([{ userId: USER, releaseGroupId: RG(1) }]);
    expect(mocks.update).toHaveBeenCalledTimes(1); // markOnboarded
    expect(typeof state.onboardedAt).toBe("string");
    expect(state).not.toHaveProperty("albumFavorites");
  });

  it("es idempotente si el usuario ya está onboardeado", async () => {
    rowsByTable.app_user = [{ onboardedAt: new Date("2026-01-01") }];

    const state = await completeOnboarding(USER, [RG(1), RG(2)]);

    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(state.onboardedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("404 si el usuario no existe", async () => {
    rowsByTable.app_user = [];
    await expect(completeOnboarding(USER, [])).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });
});
