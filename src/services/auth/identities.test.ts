import { describe, expect, it, vi } from "vitest";
import { findIdentityByProvider, resolveOrCreateOAuthUser } from "./identities";

const mocks = vi.hoisted(() => ({
  db: { insert: vi.fn(), select: vi.fn(), transaction: vi.fn() },
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

function mockInsertChain(): { returning: ReturnType<typeof vi.fn> } {
  const returning = vi.fn();
  mocks.db.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) });
  return { returning };
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
  });
});