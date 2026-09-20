import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveNewContentAudience, TYPE_DEFAULT_AUDIENCE } from "./default-audience";

const mocks = vi.hoisted(() => ({ limit: vi.fn(), select: vi.fn() }));

vi.mock("@/db", () => ({ db: { select: mocks.select } }));

// db.select().from().where().limit() → filas
function userRow(defaultAudience: string | null | undefined) {
  mocks.limit.mockResolvedValue(defaultAudience === undefined ? [] : [{ defaultAudience }]);
}

beforeEach(() => {
  vi.clearAllMocks();
  const chain = { from: () => chain, where: () => chain, limit: mocks.limit };
  mocks.select.mockReturnValue(chain);
});

describe("TYPE_DEFAULT_AUDIENCE", () => {
  it("conserva los defaults por tipo previos a la preferencia (no son uniformes)", () => {
    expect(TYPE_DEFAULT_AUDIENCE).toEqual({
      favorite: "public",
      diary: "private",
      list: "followers",
      collection: "followers",
    });
  });
});

describe("resolveNewContentAudience", () => {
  it("el valor explícito de la petición gana a la preferencia y no consulta al usuario", async () => {
    await expect(resolveNewContentAudience("u1", "list", "private")).resolves.toBe("private");
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("sin valor explícito usa la preferencia del usuario, incluso sobre el default del tipo", async () => {
    userRow("public");
    // El diario nacía siempre `private`: con preferencia `public` nace `public`.
    await expect(resolveNewContentAudience("u1", "diary")).resolves.toBe("public");
  });

  it("la preferencia se aplica a los cuatro tipos", async () => {
    userRow("followers");
    for (const type of ["favorite", "diary", "list", "collection"] as const) {
      await expect(resolveNewContentAudience("u1", type)).resolves.toBe("followers");
    }
  });

  it("sin preferencia (NULL) cada tipo conserva su default", async () => {
    userRow(null);
    for (const [type, expected] of Object.entries(TYPE_DEFAULT_AUDIENCE)) {
      await expect(
        resolveNewContentAudience("u1", type as keyof typeof TYPE_DEFAULT_AUDIENCE),
      ).resolves.toBe(expected);
    }
  });

  it("un explícito null cuenta como ausente y cae a la preferencia", async () => {
    userRow("private");
    await expect(resolveNewContentAudience("u1", "favorite", null)).resolves.toBe("private");
  });

  it("si el usuario ya no existe usa el default del tipo", async () => {
    userRow(undefined);
    await expect(resolveNewContentAudience("ghost", "collection")).resolves.toBe("followers");
  });

  it("un valor inválido guardado (dato corrupto) se ignora y cae al default del tipo", async () => {
    userRow("everyone");
    await expect(resolveNewContentAudience("u1", "favorite")).resolves.toBe("public");
  });
});
