import { beforeEach, describe, expect, it, vi } from "vitest";
import { replaceLinks, updateIdentity } from "./identity";
import type { ProfileLinkInput } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  db: { update: vi.fn(), transaction: vi.fn(), insert: vi.fn(), delete: vi.fn(), select: vi.fn() },
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
  const returning = vi.fn().mockResolvedValue([]);
  const insertValues = vi.fn().mockReturnValue({ returning });
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
    // Un cliente anterior que solo envía `pronouns` se trata como «Otro»: la clave de la
    // lista se limpia para que el CHECK de exclusión nunca se dispare.
    expect(set).toHaveBeenCalledWith({ bio: "hola", pronouns: "elle", pronounSet: null });
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

describe("updateIdentity: zona horaria y hora local", () => {
  function mockCurrentTimezone(timezone: string | null) {
    const limit = vi.fn().mockResolvedValue([{ timezone }]);
    mocks.db.select.mockReturnValue({ from: () => ({ where: () => ({ limit }) }) });
  }

  it("guarda una zona IANA válida tal cual", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { timezone: "America/Santiago" });
    expect(set).toHaveBeenCalledWith({ timezone: "America/Santiago" });
  });

  it.each(["hora de mi casa", "Mars/Olympus", "america/santiago"])("rechaza la zona %s sin tocar la base", async (timezone) => {
    await expectCode(updateIdentity("u1", { timezone }), "VALIDATION_ERROR");
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("vaciar la zona apaga la hora local (no puede quedar activada sin zona)", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { timezone: "" });
    expect(set).toHaveBeenCalledWith({ timezone: null, showLocalTime: false });
  });

  it("guarda la zona y la hora local a la vez sin consultar la base", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { timezone: "Europe/Madrid", showLocalTime: true });
    expect(set).toHaveBeenCalledWith({ timezone: "Europe/Madrid", showLocalTime: true });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("activar la hora local con una zona ya guardada funciona", async () => {
    mockCurrentTimezone("America/Santiago");
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { showLocalTime: true });
    expect(set).toHaveBeenCalledWith({ showLocalTime: true });
  });

  it("activar la hora local sin ninguna zona se rechaza y no escribe", async () => {
    mockCurrentTimezone(null);
    await expectCode(updateIdentity("u1", { showLocalTime: true }), "VALIDATION_ERROR");
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("desactivar la hora local no necesita zona", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { showLocalTime: false });
    expect(set).toHaveBeenCalledWith({ showLocalTime: false });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });
});

describe("replaceLinks", () => {
  const link = (kind: ProfileLinkInput["kind"], value: string): ProfileLinkInput => ({ kind, value });

  it("reemplaza el conjunto y asigna posición por orden", async () => {
    const { insertValues, deleteWhere } = mockLinkTransaction();
    await replaceLinks("u1", [
      link("other", "https://ana.example"),
      link("bandcamp", "https://ana.bandcamp.com"),
    ]);
    expect(deleteWhere).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith([
      { userId: "u1", kind: "other", url: "https://ana.example", position: 0 },
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
    await expectCode(replaceLinks("u1", [link("other", "javascript:alert(1)")]), "VALIDATION_ERROR");
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("rechaza un tipo fuera del conjunto cerrado", async () => {
    await expectCode(
      replaceLinks("u1", [{ kind: "myspace", value: "https://a.example" } as unknown as ProfileLinkInput]),
      "VALIDATION_ERROR",
    );
  });

  it("persiste la URL canónica: el usuario de una red social se convierte en la URL de su perfil", async () => {
    const { insertValues } = mockLinkTransaction();
    await replaceLinks("u1", [
      link("instagram", "@ana"),
      link("x", "https://twitter.com/ana_99?lang=es"),
      link("bandcamp", "MiBanda"),
      link("tiktok", "ana"),
    ]);
    expect(insertValues).toHaveBeenCalledWith([
      { userId: "u1", kind: "instagram", url: "https://www.instagram.com/ana", position: 0 },
      { userId: "u1", kind: "x", url: "https://x.com/ana_99", position: 1 },
      { userId: "u1", kind: "bandcamp", url: "https://mibanda.bandcamp.com", position: 2 },
      { userId: "u1", kind: "tiktok", url: "https://www.tiktok.com/@ana", position: 3 },
    ]);
  });

  it("un enlace sin esquema se guarda con https://", async () => {
    const { insertValues } = mockLinkTransaction();
    await replaceLinks("u1", [link("other", "www.link.com"), link("other", "otro.example/pagina")]);
    expect(insertValues).toHaveBeenCalledWith([
      { userId: "u1", kind: "other", url: "https://www.link.com", position: 0 },
      { userId: "u1", kind: "other", url: "https://otro.example/pagina", position: 1 },
    ]);
  });

  it("rechaza un enlace de otro sitio o sin usuario sin tocar la base", async () => {
    await expectCode(replaceLinks("u1", [link("instagram", "https://tiktok.com/@ana")]), "VALIDATION_ERROR");
    await expectCode(replaceLinks("u1", [link("instagram", "http://instagram.com")]), "VALIDATION_ERROR");
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("un solo enlace inválido impide guardar el conjunto completo", async () => {
    await expectCode(
      replaceLinks("u1", [link("other", "ana.example"), link("instagram", "no valido!")]),
      "VALIDATION_ERROR",
    );
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });
});

describe("updateIdentity: pronombres (tres estados)", () => {
  it.each(["he", "she", "they"] as const)("la clave %s se guarda y borra el texto libre", async (pronounSet) => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { pronounSet });
    expect(set).toHaveBeenCalledWith({ pronounSet, pronouns: null });
  });

  it("«Otro» guarda el texto recortado y deja la clave en NULL", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { pronounSet: "other", pronouns: "  ellx  " });
    expect(set).toHaveBeenCalledWith({ pronounSet: null, pronouns: "ellx" });
  });

  it("«Otro» sin texto se rechaza y no toca la base", async () => {
    await expectCode(updateIdentity("u1", { pronounSet: "other" }), "VALIDATION_ERROR");
    await expectCode(updateIdentity("u1", { pronounSet: "other", pronouns: "   " }), "VALIDATION_ERROR");
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("null (sin especificar) borra la clave y el texto", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { pronounSet: null });
    expect(set).toHaveBeenCalledWith({ pronounSet: null, pronouns: null });
  });

  it("una clave de la lista con texto libre es una combinación inválida", async () => {
    await expectCode(updateIdentity("u1", { pronounSet: "she", pronouns: "ellx" }), "VALIDATION_ERROR");
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("una clave fuera de la lista se rechaza", async () => {
    await expectCode(updateIdentity("u1", { pronounSet: "xe" as never }), "VALIDATION_ERROR");
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("un cliente anterior que envía `pronouns` vacío borra también la clave", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { pronouns: "" });
    expect(set).toHaveBeenCalledWith({ pronouns: null, pronounSet: null });
  });

  it("si la base rechaza un CHECK que el esquema no atrapó, responde un error de validación", async () => {
    const returning = vi.fn().mockRejectedValue(Object.assign(new Error("check"), { code: "23514" }));
    mocks.db.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) }) });
    await expectCode(updateIdentity("u1", { bio: "hola" }), "VALIDATION_ERROR");
  });

  it("cualquier otro error de la base se propaga sin traducirse", async () => {
    const boom = Object.assign(new Error("caída"), { code: "ECONNRESET" });
    const returning = vi.fn().mockRejectedValue(boom);
    mocks.db.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) }) });
    await expect(updateIdentity("u1", { bio: "hola" })).rejects.toBe(boom);
  });
});

describe("updateIdentity: país", () => {
  it("guarda el código de la lista", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { country: "CL" });
    expect(set).toHaveBeenCalledWith({ country: "CL" });
  });

  it("vaciar el país lo borra (cadena vacía o null)", async () => {
    const first = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { country: "" });
    expect(first.set).toHaveBeenCalledWith({ country: null });
    const second = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { country: null });
    expect(second.set).toHaveBeenCalledWith({ country: null });
  });

  it.each(["Chile", "cl", "ZZ", "CHL"])("rechaza %s y no toca la base", async (country) => {
    await expectCode(updateIdentity("u1", { country }), "VALIDATION_ERROR");
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("guarda país y ciudad a la vez sin mezclarlos", async () => {
    const { set } = mockUpdateReturning([{ id: "u1" }]);
    await updateIdentity("u1", { country: "CL", location: "Valparaíso" });
    expect(set).toHaveBeenCalledWith({ country: "CL", location: "Valparaíso" });
  });
});
