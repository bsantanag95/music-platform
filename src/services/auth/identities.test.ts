import { describe, expect, it, vi } from "vitest";
import {
  findIdentityByProvider,
  linkIdentityToUser,
  resolveOrCreateOAuthUser,
  unlinkGoogle,
  unlinkProvider,
} from "./identities";

const mocks = vi.hoisted(() => ({
  db: { insert: vi.fn(), select: vi.fn(), transaction: vi.fn(), delete: vi.fn() },
  findAvailableUsername: vi.fn(),
  findUserByEmail: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./users", () => ({
  findAvailableUsername: mocks.findAvailableUsername,
  findUserByEmail: mocks.findUserByEmail,
}));

function mockSelectChain(result: unknown[]): void {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ innerJoin });
  mocks.db.select.mockReturnValue({ from });
}

function mockInsertChain(): { values: ReturnType<typeof vi.fn>; returning: ReturnType<typeof vi.fn> } {
  const returning = vi.fn();
  const values = vi.fn().mockReturnValue({ returning });
  mocks.db.insert.mockReturnValue({ values });
  return { values, returning };
}

function mockTransaction(): void {
  mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({ insert: mocks.db.insert }),
  );
}

describe("findIdentityByProvider", () => {
  it("devuelve el usuario si la identidad existe", async () => {
    const user = { id: "u1", username: "ana", email: "ana@example.com" };
    mockSelectChain([{ user }]);

    const result = await findIdentityByProvider("google", "sub-123");
    expect(result).toEqual({ user });
  });

  it("devuelve null si la identidad no existe", async () => {
    mockSelectChain([]);

    const result = await findIdentityByProvider("google", "sub-999");
    expect(result).toBeNull();
  });
});

describe("resolveOrCreateOAuthUser", () => {
  it("devuelve el usuario existente si la identidad ya está vinculada", async () => {
    const user = { id: "u1", username: "ana", email: "ana@example.com" };
    mockSelectChain([{ user }]);

    const result = await resolveOrCreateOAuthUser({
      provider: "google",
      providerAccountId: "sub-123",
      email: "ana@example.com",
      emailVerified: true,
    });
    expect(result).toEqual(user);
  });

  it("rechaza si el email ya pertenece a una cuenta local", async () => {
    mockSelectChain([]);
    mocks.findUserByEmail.mockResolvedValueOnce({ id: "local-1" });

    await expect(
      resolveOrCreateOAuthUser({
        provider: "google",
        providerAccountId: "sub-456",
        email: "local@example.com",
        emailVerified: true,
      }),
    ).rejects.toThrow("EMAIL_TAKEN_BY_LOCAL");
  });

  it("rechaza si el email no está verificado", async () => {
    mockSelectChain([]);
    mocks.findUserByEmail.mockResolvedValueOnce(null);

    await expect(
      resolveOrCreateOAuthUser({
        provider: "google",
        providerAccountId: "sub-555",
        email: "unverified@gmail.com",
        emailVerified: false,
      }),
    ).rejects.toThrow("OAUTH_EMAIL_NOT_VERIFIED");
  });

  it("crea usuario nuevo y su identidad en una transacción", async () => {
    mockSelectChain([]);
    mocks.findUserByEmail.mockResolvedValueOnce(null);
    mocks.findAvailableUsername.mockResolvedValueOnce("juanperez");

    const newUser = { id: "new-1", username: "juanperez", email: "juan@gmail.com", displayName: null, passwordHash: null, profileVisibility: "public", createdAt: new Date() };
    const chain = mockInsertChain();
    chain.returning.mockResolvedValue([newUser]);
    mockTransaction();

    const result = await resolveOrCreateOAuthUser({
      provider: "google",
      providerAccountId: "sub-789",
      email: "juan@gmail.com",
      emailVerified: true,
      displayName: "Juan Pérez",
    });
    expect(result).toEqual(newUser);
    expect(mocks.findAvailableUsername).toHaveBeenCalledWith("juan");
    expect(mocks.db.transaction).toHaveBeenCalled();
    expect(mocks.db.insert).toHaveBeenCalledTimes(2);
    expect(chain.values.mock.calls[0]?.[0]).toMatchObject({ emailVerifiedAt: expect.any(Date) });
  });
});

describe("linkIdentityToUser", () => {
  const identity = { provider: "google", providerAccountId: "sub-999", email: "otra@gmail.com", emailVerified: true };

  it("crea la identidad enlazada por el identificador de Google, no por el email", async () => {
    mockSelectChain([]);
    const { values } = mockInsertChain();
    values.mockResolvedValue(undefined);

    await linkIdentityToUser("u1", identity);

    expect(values).toHaveBeenCalledWith({ userId: "u1", provider: "google", providerAccountId: "sub-999" });
    expect(JSON.stringify(values.mock.calls[0])).not.toContain("otra@gmail.com");
  });

  it("vincular una identidad que ya es de la misma cuenta es inocuo", async () => {
    mockSelectChain([{ user: { id: "u1" } }]);
    mocks.db.insert.mockClear();

    await expect(linkIdentityToUser("u1", identity)).resolves.toBeUndefined();
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("rechaza una identidad ya vinculada a otra cuenta, sin modificar nada", async () => {
    mockSelectChain([{ user: { id: "otra-cuenta" } }]);
    mocks.db.insert.mockClear();

    await expect(linkIdentityToUser("u1", identity)).rejects.toThrow("OAUTH_IDENTITY_TAKEN");
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("traduce una carrera (unique violation) a OAUTH_IDENTITY_TAKEN", async () => {
    mockSelectChain([]);
    const { values } = mockInsertChain();
    values.mockRejectedValue({ code: "23505" });

    await expect(linkIdentityToUser("u1", identity)).rejects.toThrow("OAUTH_IDENTITY_TAKEN");
  });
});

describe("unlinkProvider", () => {
  it("borra las identidades del proveedor de la cuenta y devuelve cuántas", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "i1" }]);
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) });
    expect(await unlinkProvider("u1", "google")).toBe(1);
  });

  it("devuelve 0 si no había identidad de ese proveedor", async () => {
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) });
    expect(await unlinkProvider("u1", "google")).toBe(0);
  });
});

describe("unlinkGoogle", () => {
  function userWithPassword(passwordHash: string | null) {
    const limit = vi.fn().mockResolvedValue([{ passwordHash }]);
    mocks.db.select.mockReturnValue({ from: () => ({ where: () => ({ limit }) }) });
  }

  it("desvincula Google de una cuenta con contraseña", async () => {
    userWithPassword("$argon2id$hash");
    const returning = vi.fn().mockResolvedValue([{ id: "i1" }]);
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) });

    await expect(unlinkGoogle("u1")).resolves.toBeUndefined();
    expect(returning).toHaveBeenCalledOnce();
  });

  it("rechaza con LAST_ACCESS_METHOD si Google es el único acceso, sin borrar nada", async () => {
    userWithPassword(null);
    mocks.db.delete.mockClear();

    await expect(unlinkGoogle("u1")).rejects.toMatchObject({ code: "LAST_ACCESS_METHOD", status: 409 });
    expect(mocks.db.delete).not.toHaveBeenCalled();
  });

  it("responde USER_NOT_FOUND si la cuenta no existe", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    mocks.db.select.mockReturnValue({ from: () => ({ where: () => ({ limit }) }) });
    await expect(unlinkGoogle("nadie")).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });
});

