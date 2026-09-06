import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  toggleFavorite,
  removeFavorite,
  updateFavoriteAudience,
  updateFavoritesAudienceBulk,
  listMyFavorites,
  listUserFavorites,
  resolveFavoriteTarget,
  type FavoriteTarget,
} from "./favorites";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
  getProfileByUsername: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: mocks.getProfileByUsername,
}));

// select().from().where().limit() → terminal limit
function whereLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { from };
}

// select().from().leftJoin()×3.where().limit() → join del detalle/owned
function joinLimit(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const chain = { leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

// select().from().leftJoin()×3.where().orderBy().limit().offset() → paginado
function joinPaged(rows: unknown[]) {
  const offset = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn(() => ({ offset }));
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const chain = { leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

// select().from().leftJoin()×3.where() → terminal where (agregado de counts)
function joinWhere(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const chain = { leftJoin: vi.fn(() => chain), where };
  const from = vi.fn(() => chain);
  return { from };
}

const zeroCounts = { artist: 0, releaseGroup: 0, recording: 0 };

// listMyFavorites / listUserFavorites hacen dos selects: primero el paginado,
// luego el agregado de counts.
function mockListQueries(rows: unknown[], counts = zeroCounts) {
  mocks.db.select
    .mockReturnValueOnce(joinPaged(rows))
    .mockReturnValueOnce(joinWhere([counts]));
}

const target: FavoriteTarget = { type: "artist", id: "00000000-0000-4000-8000-000000000001" };
const user = "00000000-0000-4000-8000-000000000002";

const favoriteRow = {
  id: "00000000-0000-4000-8000-000000000003",
  audience: "followers",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  artistId: target.id,
  releaseGroupId: null,
  recordingId: null,
  artistName: "Pink Floyd",
  releaseTitle: null,
  releaseCover: null,
  recordingTitle: null,
};

describe("servicio de favoritos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resuelve el objetivo y rechaza uno inexistente con FAVORITE_TARGET_INVALID", async () => {
    mocks.db.select.mockReturnValue(whereLimit([{ id: target.id }]));
    const resolved = await resolveFavoriteTarget("artist", target.id);
    expect(resolved.type).toBe("artist");

    mocks.db.select.mockReturnValue(whereLimit([]));
    await expect(resolveFavoriteTarget("artist", target.id)).rejects.toMatchObject({
      code: "FAVORITE_TARGET_INVALID",
      status: 404,
    });
  });

  it("crea un favorito nuevo cuando no existe", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: target.id }])) // resolveFavoriteTarget - artista existe
      .mockReturnValueOnce(whereLimit([])) // buscar existente
      .mockReturnValueOnce(joinLimit([favoriteRow])); // getOwnedFavorite
    const values = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([favoriteRow]),
    });
    mocks.db.insert.mockReturnValue({ values });

    const result = await toggleFavorite(target, user);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(favoriteRow.id);
  });

  it("elimina un favorito existente (toggle off)", async () => {
    mocks.db.select
      .mockReturnValueOnce(whereLimit([{ id: target.id }])) // resolveFavoriteTarget - artista existe
      .mockReturnValueOnce(whereLimit([{ id: favoriteRow.id }])); // buscar existente
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

    const result = await toggleFavorite(target, user);
    expect(result).toBeNull();
  });

  it("rechaza un favorito con objetivo inexistente con FAVORITE_TARGET_INVALID", async () => {
    mocks.db.select.mockReturnValue(whereLimit([])); // resolveFavoriteTarget - artista no existe

    await expect(
      toggleFavorite({ type: "artist", id: "00000000-0000-4000-8000-000000000099" }, user),
    ).rejects.toMatchObject({
      code: "FAVORITE_TARGET_INVALID",
    });
  });

  it("rechaza una paginación inválida", async () => {
    await expect(listMyFavorites(user, 0)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    await expect(listMyFavorites(user, 1, 0)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rechaza filtros inválidos con VALIDATION_ERROR", async () => {
    await expect(
      listMyFavorites(user, 1, 20, { sort: "chronological" as never }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      listMyFavorites(user, 1, 20, { type: "playlist" as never }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      listMyFavorites(user, 1, 20, { audience: "everyone" as never }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("listMyFavorites devuelve vacío y counts en cero cuando no hay favoritos", async () => {
    mockListQueries([]);

    const result = await listMyFavorites(user);
    expect(result.favorites).toEqual([]);
    expect(result.hasNext).toBe(false);
    expect(result.counts).toEqual({ artist: 0, "release-group": 0, recording: 0 });
  });

  it("listMyFavorites pagina correctamente con hasNext y expone counts", async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      ...favoriteRow,
      id: `favorito-${i}`,
      createdAt: new Date(Date.now() - i * 1000),
    }));

    mockListQueries(rows, { artist: 12, releaseGroup: 7, recording: 2 });

    const result = await listMyFavorites(user, 1, 20);
    expect(result.favorites.length).toBe(20);
    expect(result.hasNext).toBe(true);
    expect(result.counts).toEqual({ artist: 12, "release-group": 7, recording: 2 });
  });

  it("listMyFavorites acepta filtros combinados y separa counts (sin el filtro type) del listado", async () => {
    const paged = joinPaged([favoriteRow]);
    const countsChain = joinWhere([{ artist: 3, releaseGroup: 1, recording: 0 }]);
    mocks.db.select.mockReturnValueOnce(paged).mockReturnValueOnce(countsChain);

    const result = await listMyFavorites(user, 1, 20, {
      type: "artist",
      audience: "public",
      q: "floyd",
      sort: "alpha",
    });

    expect(result.favorites.length).toBe(1);
    // counts refleja el conjunto sin el filtro de tipo: los tres tipos siguen presentes.
    expect(result.counts).toEqual({ artist: 3, "release-group": 1, recording: 0 });
  });

  it("listUserFavorites devuelve vacío y counts en cero cuando no hay permiso", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "otro-usuario",
      profileVisibility: "private",
      relation: "none",
      blockedByMe: false,
    });

    const result = await listUserFavorites("otro-usuario", user);
    expect(result.favorites).toEqual([]);
    expect(result.counts).toEqual({ artist: 0, "release-group": 0, recording: 0 });
  });

  it("listUserFavorites filtra por audiencia del perfil y trae counts", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "otro-usuario",
      profileVisibility: "public",
      relation: "none",
      blockedByMe: false,
    });

    mockListQueries([favoriteRow], { artist: 1, releaseGroup: 0, recording: 0 });

    const result = await listUserFavorites("otro-usuario", user);
    expect(result.favorites.length).toBe(1);
    expect(result.counts.artist).toBe(1);
  });

  it("listUserFavorites devuelve vacío si el perfil es privado y no hay relación aprobada", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "otro-usuario",
      profileVisibility: "private",
      relation: "requested",
      blockedByMe: false,
    });

    const result = await listUserFavorites("otro-usuario", user);
    expect(result.favorites).toEqual([]);
  });

  it("listUserFavorites permite ver favoritos de seguidor aprobado", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "otro-usuario",
      profileVisibility: "public",
      relation: "following",
      blockedByMe: false,
    });

    mockListQueries([favoriteRow]);

    const result = await listUserFavorites("otro-usuario", user);
    expect(result.favorites.length).toBe(1);
  });

  it("updateFavoriteAudience actualiza la audiencia de un favorito propio", async () => {
    const returning = vi.fn().mockResolvedValue([favoriteRow]);
    mocks.db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning }),
      }),
    });

    mocks.db.select.mockReturnValue(joinLimit([{ ...favoriteRow, audience: "public" }]));

    const result = await updateFavoriteAudience(favoriteRow.id, user, "public");
    expect(result.audience).toBe("public");
  });

  it("updateFavoriteAudience rechaza un favorito ajeno", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    mocks.db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning }),
      }),
    });

    await expect(
      updateFavoriteAudience(favoriteRow.id, user, "public"),
    ).rejects.toMatchObject({
      code: "FAVORITE_NOT_FOUND",
      status: 404,
    });
  });

  describe("updateFavoritesAudienceBulk", () => {
    function mockUpdateReturning(rows: unknown[]) {
      const returning = vi.fn().mockResolvedValue(rows);
      mocks.db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ returning }),
        }),
      });
    }

    it("actualiza varios favoritos propios y devuelve sus ids", async () => {
      mockUpdateReturning([{ id: "a" }, { id: "b" }, { id: "c" }]);
      const result = await updateFavoritesAudienceBulk(["a", "b", "c"], user, "private");
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("ignora ids ajenos del conjunto (solo devuelve los propios actualizados)", async () => {
      mockUpdateReturning([{ id: "a" }, { id: "b" }]);
      const result = await updateFavoritesAudienceBulk(["a", "b", "ajeno"], user, "public");
      expect(result).toEqual(["a", "b"]);
    });

    it("lanza FAVORITE_NOT_FOUND si ningún id es del usuario", async () => {
      mockUpdateReturning([]);
      await expect(
        updateFavoritesAudienceBulk(["x", "y"], user, "public"),
      ).rejects.toMatchObject({ code: "FAVORITE_NOT_FOUND", status: 404 });
    });

    it("rechaza un conjunto vacío o excesivo con VALIDATION_ERROR", async () => {
      await expect(updateFavoritesAudienceBulk([], user, "public")).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
      });
      const tooMany = Array.from({ length: 51 }, (_, i) => `id-${i}`);
      await expect(
        updateFavoritesAudienceBulk(tooMany, user, "public"),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  it("removeFavorite es idempotente aunque el favorito no exista", async () => {
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    await expect(removeFavorite(target, user)).resolves.toBeUndefined();
  });

  it("verifica independencia estructural con rating (no importa rating.ts)", async () => {
    const content = readFileSync(
      join(import.meta.dirname, "favorites.ts"),
      "utf-8",
    );
    expect(content).not.toMatch(/from.*schema.*import.*\brating\b/);
    expect(content).not.toMatch(/require.*rating/);
  });
});
