import { beforeEach, describe, expect, it, vi } from "vitest";

type EmailInput = { to: string; locale: string; token: string; appUrl: string };

const mocks = vi.hoisted(() => ({
  db: {
    transaction: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
  send: vi.fn(),
  findUserWithPasswordByEmail: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  buildEmail: vi.fn((input: EmailInput) => ({
    to: input.to,
    subject: "subject",
    text: input.token,
    html: input.token,
  })),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/db/schema", () => ({
  appUser: { id: "appUser.id" },
  session: { userId: "session.userId" },
  passwordResetToken: {
    id: "prt.id",
    userId: "prt.userId",
    tokenHash: "prt.tokenHash",
    createdAt: "prt.createdAt",
    expiresAt: "prt.expiresAt",
  },
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => ({ conditions })),
  eq: vi.fn((field: unknown, value: unknown) => ({ field, value })),
  gt: vi.fn((field: unknown, value: unknown) => ({ field, value })),
  lt: vi.fn((field: unknown, value: unknown) => ({ field, value })),
}));
vi.mock("@/services/email", () => ({ getEmailTransport: () => ({ send: mocks.send }) }));
vi.mock("@/services/email/templates/password-reset", () => ({
  buildPasswordResetEmail: mocks.buildEmail,
}));
vi.mock("./password", () => ({ hashPassword: mocks.hashPassword, verifyPassword: mocks.verifyPassword }));
vi.mock("./users", () => ({
  findUserWithPasswordByEmail: mocks.findUserWithPasswordByEmail,
}));

import {
  RESET_TOKEN_TTL_MS,
  cleanupExpiredResetTokens,
  consumeResetToken,
  findValidResetToken,
  hashResetToken,
  requestPasswordReset,
  resetPassword,
} from "./password-reset";

function mockUpsert() {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn((value: unknown) => {
    void value;
    return { onConflictDoUpdate };
  });
  mocks.db.insert.mockReturnValue({ values });
  return { values, onConflictDoUpdate };
}

function mockSelectRow(row: unknown) {
  const limit = vi.fn().mockResolvedValue(row ? [row] : []);
  const where = () => ({ limit });
  mocks.db.select.mockReturnValue({ from: () => ({ innerJoin: () => ({ where }), where }) });
}

function mockConsumeReturning(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  mocks.db.delete.mockReturnValue({ where });
  return { where, returning };
}

function mockTransaction() {
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const deleteWhere = vi.fn().mockResolvedValue(undefined);
  const tx = {
    update: vi.fn(() => ({ set: updateSet })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  };
  mocks.db.transaction.mockImplementation(async (cb: (t: typeof tx) => Promise<void>) => cb(tx));
  return { tx, updateSet, updateWhere, deleteWhere };
}

describe("requestPasswordReset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.send.mockResolvedValue(undefined);
  });

  it("guarda un token con TTL de 30 minutos (upsert) y envía el correo para una cuenta local", async () => {
    mocks.findUserWithPasswordByEmail.mockResolvedValue({ id: "u1", passwordHash: "hash" });
    const { values, onConflictDoUpdate } = mockUpsert();

    const before = Date.now();
    await requestPasswordReset("Ana@Example.com", "es");

    expect(mocks.findUserWithPasswordByEmail).toHaveBeenCalledWith("ana@example.com");
    const inserted = values.mock.calls[0]?.[0] as {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    };
    expect(inserted.userId).toBe("u1");
    expect(inserted.tokenHash).toHaveLength(64);
    expect(inserted.expiresAt.getTime()).toBeGreaterThanOrEqual(before + RESET_TOKEN_TTL_MS);
    expect(onConflictDoUpdate).toHaveBeenCalledOnce();

    expect(mocks.send).toHaveBeenCalledOnce();
    const message = mocks.send.mock.calls[0]?.[0] as { to: string; text: string };
    expect(message.to).toBe("ana@example.com");
    expect(inserted.tokenHash).toBe(hashResetToken(message.text));
  });

  it("no genera token ni envía correo para un email inexistente", async () => {
    mocks.findUserWithPasswordByEmail.mockResolvedValue(null);

    await requestPasswordReset("nadie@example.com", "es");

    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("no genera token ni envía correo para una cuenta sin contraseña local (solo-Google)", async () => {
    mocks.findUserWithPasswordByEmail.mockResolvedValue({ id: "u2", passwordHash: null });

    await requestPasswordReset("google@example.com", "es");

    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe("tokens de restablecimiento", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findValidResetToken devuelve la fila vigente con el hash actual", async () => {
    mockSelectRow({ userId: "u1", passwordHash: "old-hash" });
    await expect(findValidResetToken("tok")).resolves.toEqual({ userId: "u1", passwordHash: "old-hash" });
  });

  it("findValidResetToken devuelve null si no hay coincidencia", async () => {
    mockSelectRow(null);
    await expect(findValidResetToken("tok")).resolves.toBeNull();
  });

  it("consumeResetToken devuelve el usuario y borra la fila", async () => {
    mockConsumeReturning([{ userId: "u1" }]);
    await expect(consumeResetToken("tok")).resolves.toEqual({ userId: "u1" });
  });

  it("resetPassword actualiza el hash, borra tokens y todas las sesiones en una transacción", async () => {
    mockSelectRow({ userId: "u1", passwordHash: "old-hash" });
    mockConsumeReturning([{ userId: "u1" }]);
    const { updateSet, deleteWhere } = mockTransaction();
    mocks.verifyPassword.mockResolvedValue(false);
    mocks.hashPassword.mockResolvedValue("new-hash");

    await expect(resetPassword("tok", "new-password")).resolves.toBe("ok");

    expect(mocks.verifyPassword).toHaveBeenCalledWith("old-hash", "new-password");
    expect(mocks.hashPassword).toHaveBeenCalledWith("new-password");
    expect(updateSet).toHaveBeenCalledWith({ passwordHash: "new-hash" });
    // Un delete para los tokens restantes y otro para las sesiones.
    expect(deleteWhere).toHaveBeenCalledTimes(2);
  });

  it("resetPassword rechaza reusar la contraseña actual sin consumir el token", async () => {
    mockSelectRow({ userId: "u1", passwordHash: "old-hash" });
    const consume = mockConsumeReturning([]);
    mocks.verifyPassword.mockResolvedValue(true);

    await expect(resetPassword("tok", "old-password")).resolves.toBe("password_reused");

    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(consume.where).not.toHaveBeenCalled();
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("resetPassword no toca nada si el token no es válido", async () => {
    mockSelectRow(null);

    await expect(resetPassword("bad", "new-password")).resolves.toBe("invalid_token");

    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("resetPassword no aplica cambios si el token se consumió en carrera", async () => {
    mockSelectRow({ userId: "u1", passwordHash: "old-hash" });
    mockConsumeReturning([]);
    mocks.verifyPassword.mockResolvedValue(false);
    mocks.hashPassword.mockResolvedValue("new-hash");

    await expect(resetPassword("tok", "new-password")).resolves.toBe("invalid_token");

    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("cleanupExpiredResetTokens borra los vencidos", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    mocks.db.delete.mockReturnValue({ where });

    await cleanupExpiredResetTokens();

    expect(where).toHaveBeenCalledOnce();
  });
});
