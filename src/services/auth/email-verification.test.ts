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
  getEmailTransport: vi.fn(),
  buildEmail: vi.fn((input: EmailInput) => ({
    to: input.to,
    subject: "subject",
    text: input.token,
    html: input.token,
  })),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/db/schema", () => ({
  appUser: { id: "appUser.id", email: "appUser.email", emailVerifiedAt: "appUser.emailVerifiedAt" },
  emailVerificationToken: {
    id: "evt.id",
    userId: "evt.userId",
    tokenHash: "evt.tokenHash",
    createdAt: "evt.createdAt",
    expiresAt: "evt.expiresAt",
  },
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => ({ conditions })),
  eq: vi.fn((field: unknown, value: unknown) => ({ field, value })),
  gt: vi.fn((field: unknown, value: unknown) => ({ field, value })),
  lt: vi.fn((field: unknown, value: unknown) => ({ field, value })),
}));
vi.mock("@/services/email", () => ({ getEmailTransport: mocks.getEmailTransport }));
vi.mock("@/services/email/templates/email-verification", () => ({
  buildEmailVerificationEmail: mocks.buildEmail,
}));

import {
  VERIFICATION_TOKEN_TTL_MS,
  cleanupExpiredVerificationTokens,
  consumeVerificationToken,
  findValidVerificationToken,
  hashVerificationToken,
  requestEmailVerification,
  resendEmailVerification,
  verifyEmail,
} from "./email-verification";

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
  mocks.db.select.mockReturnValue({ from: () => ({ where: () => ({ limit }) }) });
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
  return { updateSet, deleteWhere };
}

describe("requestEmailVerification (registro, best-effort)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEmailTransport.mockReturnValue({ send: mocks.send });
    mocks.send.mockResolvedValue(undefined);
    mocks.db.select.mockReset();
  });

  it("genera un token (TTL 24 h) y envía el correo para una cuenta sin verificar", async () => {
    mockSelectRow({ email: "ana@example.com", emailVerifiedAt: null });
    const { values, onConflictDoUpdate } = mockUpsert();

    const before = Date.now();
    await requestEmailVerification("u1", "es");

    const inserted = values.mock.calls[0]?.[0] as {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    };
    expect(inserted.userId).toBe("u1");
    expect(inserted.tokenHash).toHaveLength(64);
    expect(inserted.expiresAt.getTime()).toBeGreaterThanOrEqual(before + VERIFICATION_TOKEN_TTL_MS);
    expect(onConflictDoUpdate).toHaveBeenCalledOnce();

    const message = mocks.send.mock.calls[0]?.[0] as { to: string; text: string };
    expect(message.to).toBe("ana@example.com");
    expect(inserted.tokenHash).toBe(hashVerificationToken(message.text));
  });

  it("es un no-op si la cuenta ya está verificada", async () => {
    mockSelectRow({ email: "ana@example.com", emailVerifiedAt: new Date() });

    await requestEmailVerification("u1", "es");

    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("no crea token ni lanza si no hay transporte configurado", async () => {
    mocks.getEmailTransport.mockImplementation(() => {
      throw new Error("EMAIL_CONFIG_MISSING");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(requestEmailVerification("u1", "es")).resolves.toBeUndefined();

    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("resendEmailVerification (autenticado)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEmailTransport.mockReturnValue({ send: mocks.send });
    mocks.send.mockResolvedValue(undefined);
  });

  it("reenvía para una cuenta sin verificar", async () => {
    mockSelectRow({ email: "ana@example.com", emailVerifiedAt: null });
    mockUpsert();

    await expect(resendEmailVerification("u1", "en")).resolves.toBe("sent");
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it("responde already_verified sin enviar", async () => {
    mockSelectRow({ email: "ana@example.com", emailVerifiedAt: new Date() });

    await expect(resendEmailVerification("u1", "es")).resolves.toBe("already_verified");
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe("tokens de verificación", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findValidVerificationToken devuelve la fila vigente", async () => {
    mockSelectRow({ userId: "u1" });
    await expect(findValidVerificationToken("tok")).resolves.toEqual({ userId: "u1" });
  });

  it("findValidVerificationToken devuelve null si no hay coincidencia", async () => {
    mockSelectRow(null);
    await expect(findValidVerificationToken("tok")).resolves.toBeNull();
  });

  it("consumeVerificationToken devuelve el usuario y borra la fila", async () => {
    mockConsumeReturning([{ userId: "u1" }]);
    await expect(consumeVerificationToken("tok")).resolves.toEqual({ userId: "u1" });
  });

  it("verifyEmail marca el email y borra los tokens en una transacción", async () => {
    mockConsumeReturning([{ userId: "u1" }]);
    const { updateSet, deleteWhere } = mockTransaction();

    await expect(verifyEmail("tok")).resolves.toBe(true);

    expect(updateSet).toHaveBeenCalledWith({ emailVerifiedAt: expect.any(Date) });
    expect(deleteWhere).toHaveBeenCalledOnce();
  });

  it("verifyEmail devuelve false si el token no es válido", async () => {
    mockConsumeReturning([]);

    await expect(verifyEmail("bad")).resolves.toBe(false);
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("cleanupExpiredVerificationTokens borra los vencidos", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    mocks.db.delete.mockReturnValue({ where });

    await cleanupExpiredVerificationTokens();

    expect(where).toHaveBeenCalledOnce();
  });
});
