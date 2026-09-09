import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { completeOnboarding, seedAlbumFavorites } from "./onboarding";

const rowsByTable: Record<string, unknown[]> = {};

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  replaceAlbumFavorites: vi.fn(),
  getAlbumFavorites: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: { select: mocks.select, insert: mocks.insert, update: mocks.update },
}));
vi.mock("@/services/profiles/album-favorites", () => ({
  PROFILE_MAX_ALBUM_FAVORITES: 6,
  replaceAlbumFavorites: mocks.replaceAlbumFavorites,
  getAlbumFavorites: mocks.getAlbumFavorites,
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
const FID = (n: number) => `fav-${n}`;
const USER = "user-1";

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(rowsByTable)) delete rowsByTable[k];
  mocks.select.mockImplementation(() => chainFor());
  mocks.insert.mockReturnValue({
    values: () => ({ returning: async () => [] }),
  });
  mocks.update.mockReturnValue({ set: () => ({ where: async () => undefined }) });
  mocks.replaceAlbumFavorites.mockResolvedValue([]);
  mocks.getAlbumFavorites.mockResolvedValue([]);
});

describe("seedAlbumFavorites", () => {
  it("con lista vacía solo delega a replaceAlbumFavorites([])", async () => {
    await seedAlbumFavorites(USER, []);
    expect(mocks.replaceAlbumFavorites).toHaveBeenCalledWith(USER, []);
  });

  it("rechaza más de 6 álbumes", async () => {
    await expect(
      seedAlbumFavorites(USER, [RG(1), RG(2), RG(3), RG(4), RG(5), RG(6), RG(7)]),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.replaceAlbumFavorites).not.toHaveBeenCalled();
  });

  it("rechaza ids duplicados", async () => {
    await expect(seedAlbumFavorites(USER, [RG(1), RG(1)])).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rechaza un release-group inexistente", async () => {
    rowsByTable.release_group = [{ id: RG(1) }]; // se pidieron RG1 y RG2
    await expect(seedAlbumFavorites(USER, [RG(1), RG(2)])).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mocks.replaceAlbumFavorites).not.toHaveBeenCalled();
  });

  it("crea los favoritos que faltan y fija el conjunto en el orden elegido", async () => {
    rowsByTable.release_group = [{ id: RG(1) }, { id: RG(2) }];
    rowsByTable.favorite = [{ id: FID(1), releaseGroupId: RG(1) }]; // RG1 ya favorito, RG2 no
    mocks.insert.mockReturnValue({
      values: () => ({ returning: async () => [{ id: FID(2), releaseGroupId: RG(2) }] }),
    });

    await seedAlbumFavorites(USER, [RG(2), RG(1)]);

    expect(mocks.insert).toHaveBeenCalledTimes(1);
    // orden = orden de elección: RG2 (fav nuevo) primero, RG1 después
    expect(mocks.replaceAlbumFavorites).toHaveBeenCalledWith(USER, [FID(2), FID(1)]);
  });

  it("no toca la tabla de valoración", () => {
    const src = readFileSync(
      join(process.cwd(), "src/services/onboarding/onboarding.ts"),
      "utf8",
    );
    const schemaImports = src.match(/import\s*\{([^}]*)\}\s*from\s*"@\/db\/schema"/)?.[1] ?? "";
    const ids = schemaImports.split(",").map((p) => p.trim().split(/\s+as\s+/)[0]);
    expect(ids).not.toContain("rating");
  });
});

describe("completeOnboarding", () => {
  it("siembra y marca cuando el usuario está pendiente", async () => {
    rowsByTable.app_user = [{ onboardedAt: null }];
    rowsByTable.release_group = [{ id: RG(1) }];
    rowsByTable.favorite = [{ id: FID(1), releaseGroupId: RG(1) }];
    mocks.replaceAlbumFavorites.mockResolvedValue([
      { id: "pin1", favoriteId: FID(1), position: 1, target: { id: RG(1), title: "A", artistName: null, coverThumbUrl: null } },
    ]);

    const state = await completeOnboarding(USER, [RG(1)]);

    expect(mocks.replaceAlbumFavorites).toHaveBeenCalledWith(USER, [FID(1)]);
    expect(mocks.update).toHaveBeenCalledTimes(1); // markOnboarded
    expect(state.albumFavorites).toHaveLength(1);
  });

  it("es idempotente si el usuario ya está onboardeado", async () => {
    rowsByTable.app_user = [{ onboardedAt: new Date("2026-01-01") }];
    mocks.getAlbumFavorites.mockResolvedValue([]);

    await completeOnboarding(USER, [RG(1), RG(2)]);

    expect(mocks.replaceAlbumFavorites).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.getAlbumFavorites).toHaveBeenCalled();
  });

  it("404 si el usuario no existe", async () => {
    rowsByTable.app_user = [];
    await expect(completeOnboarding(USER, [])).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });
});
