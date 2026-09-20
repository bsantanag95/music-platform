import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { getAccessMethod, updateAccountPreferences } from "./account-settings";

const mocks = vi.hoisted(() => ({ select: vi.fn(), update: vi.fn() }));
vi.mock("@/db", () => ({ db: { select: mocks.select, update: mocks.update } }));

// db.update().set(patch).where().returning() → filas; se conserva `patch`.
let updatedRows: { id: string }[] = [{ id: "u1" }];
const set = vi.fn();

// db.select(...).from(tabla)[.where().limit()] resuelve por tabla.
const rowsByTable: Record<string, unknown[]> = {};
function selectChain() {
  let table = "";
  const step: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "from") {
          return (t: Parameters<typeof getTableName>[0]) => {
            table = getTableName(t);
            return step;
          };
        }
        if (prop === "then") {
          const p = Promise.resolve(rowsByTable[table] ?? []);
          return p.then.bind(p);
        }
        return () => step;
      },
    },
  );
  return step;
}

beforeEach(() => {
  vi.clearAllMocks();
  updatedRows = [{ id: "u1" }];
  for (const key of Object.keys(rowsByTable)) delete rowsByTable[key];
  set.mockImplementation(() => ({
    where: () => ({ returning: () => Promise.resolve(updatedRows) }),
  }));
  mocks.update.mockReturnValue({ set });
  mocks.select.mockImplementation(() => selectChain());
});

describe("updateAccountPreferences", () => {
  it("recorta el nombre visible antes de guardarlo", async () => {
    await updateAccountPreferences("u1", { displayName: "  Ana  " });
    expect(set).toHaveBeenCalledWith({ displayName: "Ana" });
  });

  it("un nombre vacío o solo espacios se guarda como null (el sitio muestra el username)", async () => {
    await updateAccountPreferences("u1", { displayName: "   " });
    expect(set).toHaveBeenCalledWith({ displayName: null });

    await updateAccountPreferences("u1", { displayName: null });
    expect(set).toHaveBeenLastCalledWith({ displayName: null });
  });

  it("rechaza un nombre de más de 50 caracteres con VALIDATION_ERROR", async () => {
    await expect(updateAccountPreferences("u1", { displayName: "x".repeat(51) })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("acepta exactamente 50 caracteres", async () => {
    await updateAccountPreferences("u1", { displayName: "x".repeat(50) });
    expect(set).toHaveBeenCalledWith({ displayName: "x".repeat(50) });
  });

  it("guarda la audiencia por defecto y `null` la devuelve a 'según el tipo'", async () => {
    await updateAccountPreferences("u1", { defaultAudience: "followers" });
    expect(set).toHaveBeenCalledWith({ defaultAudience: "followers" });

    await updateAccountPreferences("u1", { defaultAudience: null });
    expect(set).toHaveBeenLastCalledWith({ defaultAudience: null });
  });

  it("rechaza una audiencia inválida sin tocar la base", async () => {
    await expect(
      updateAccountPreferences("u1", { defaultAudience: "everyone" as never }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("no toca los campos que no llegan (undefined = no tocar)", async () => {
    await updateAccountPreferences("u1", { displayName: "Ana" });
    expect(set).toHaveBeenCalledWith({ displayName: "Ana" });
    expect(set).not.toHaveBeenCalledWith(expect.objectContaining({ defaultAudience: expect.anything() }));

    await updateAccountPreferences("u1", {});
    expect(set).toHaveBeenCalledTimes(1);
  });

  it("solo reescribe la fila del propio usuario y nunca contenido existente", async () => {
    await updateAccountPreferences("u1", { defaultAudience: "public" });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(getTableName(mocks.update.mock.calls[0]![0])).toBe("app_user");
  });

  it("USER_NOT_FOUND si la cuenta ya no existe", async () => {
    updatedRows = [];
    await expect(updateAccountPreferences("ghost", { displayName: "Ana" })).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
      status: 404,
    });
  });
});

describe("getAccessMethod", () => {
  it("una cuenta con contraseña local y sin proveedores", async () => {
    rowsByTable.app_user = [{ passwordHash: "$argon2id$secreto" }];
    await expect(getAccessMethod("u1")).resolves.toEqual({ hasPassword: true, providers: [] });
  });

  it("una cuenta de Google no tiene contraseña", async () => {
    rowsByTable.app_user = [{ passwordHash: null }];
    rowsByTable.auth_identity = [{ provider: "google" }];
    await expect(getAccessMethod("u1")).resolves.toEqual({ hasPassword: false, providers: ["google"] });
  });

  it("nunca devuelve el hash de la contraseña", async () => {
    rowsByTable.app_user = [{ passwordHash: "$argon2id$secreto" }];
    const result = await getAccessMethod("u1");
    expect(JSON.stringify(result)).not.toContain("argon2");
    expect(result).toEqual({ hasPassword: true, providers: [] });
  });

  it("deduplica y ordena los proveedores", async () => {
    rowsByTable.app_user = [{ passwordHash: "x" }];
    rowsByTable.auth_identity = [{ provider: "google" }, { provider: "apple" }, { provider: "google" }];
    await expect(getAccessMethod("u1")).resolves.toMatchObject({ providers: ["apple", "google"] });
  });

  it("USER_NOT_FOUND si la cuenta no existe", async () => {
    await expect(getAccessMethod("ghost")).rejects.toMatchObject({ code: "USER_NOT_FOUND", status: 404 });
  });
});
