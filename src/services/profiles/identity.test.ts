import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceLinks, updateIdentity } from "./identity";
import type { ProfileLinkInput } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  db: { update: vi.fn(), transaction: vi.fn(), insert: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

function mockUpdateReturning(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  mocks.db.update.mockReturnValue({ set });
  return { set };
}

function mockLinkTransaction() {
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  mocks.db.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      delete: vi.fn().mockReturnValue({ where: deleteWhere }),
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    }),
  );
  return { insertValues, deleteWhere };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({ code });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateIdentity", () => {
  it("recorta y persiste los campos provistos", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { bio: "  hola  ", pronouns: "elle" });
    expect(set).toHaveBeenCalledWith({ bio: "hola", pronouns: "elle" });
  });

  it("normaliza cadena vacía a null (vaciar un campo)", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { bio: "   " });
    expect(set).toHaveBeenCalledWith({ bio: null });
  });

  it("ignora las claves no provistas", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { location: "Rosario" });
    expect(set).toHaveBeenCalledWith({ location: "Rosario" });
  });

  it("no toca la BD si no hay cambios", async () => {
    await updateIdentity("u1", {});
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("rechaza una bio de más de 200 caracteres", async () => {
    await expectCode(updateIdentity("u1", { bio: "x".repeat(201) }), "VALIDATION_ERROR");
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("rechaza pronombres de más de 40 caracteres", async () => {
    await expectCode(updateIdentity("u1", { pronouns: "y".repeat(41) }), "VALIDATION_ERROR");
  });

  it("USER_NOT_FOUND si el update no afecta filas", async () => {
    mockUpdateReturning([]);
    await expectCode(updateIdentity("desconocido", { bio: "hola" }), "USER_NOT_FOUND");
  });
});

describe("replaceLinks", () => {
  const link = (kind: ProfileLinkInput["kind"], url: string): ProfileLinkInput => ({ kind, url });

  it("reemplaza el conjunto y asigna posición por orden", async () => {
    const { insertValues, deleteWhere } = mockLinkTransaction();
    await replaceLinks("u1", [
      link("website", "https://ana.example"),
      link("bandcamp", "https://ana.bandcamp.com"),
    ]);
    expect(deleteWhere).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith([
      { userId: "u1", kind: "website", url: "https://ana.example", position: 0 },
      { userId: "u1", kind: "bandcamp", url: "https://ana.bandcamp.com", position: 1 },
    ]);
  });

  it("permite vaciar todos los enlaces sin insertar", async () => {
    const { insertValues, deleteWhere } = mockLinkTransaction();
    await replaceLinks("u1", []);
    expect(deleteWhere).toHaveBeenCalled();
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("rechaza un sexto enlace", async () => {
    const links = Array.from({ length: 6 }, (_, i) => link("other", `https://x${i}.example`));
    await expectCode(replaceLinks("u1", links), "VALIDATION_ERROR");
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("rechaza una URL que no es http(s)", async () => {
    await expectCode(
      replaceLinks("u1", [{ kind: "website", url: "javascript:alert(1)" } as ProfileLinkInput]),
      "VALIDATION_ERROR",
    );
  });

  it("rechaza un tipo fuera del conjunto cerrado", async () => {
    await expectCode(
      replaceLinks("u1", [{ kind: "myspace", url: "https://a.example" } as unknown as ProfileLinkInput]),
      "VALIDATION_ERROR",
    );
  });
});
