import { describe, expect, it, vi } from "vitest";
import { blockUser, listBlocks, unblockUser } from "./blocking";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
  isBlockedBetween: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./relations", () => ({ isBlockedBetween: mocks.isBlockedBetween }));

function mockSelectChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  mocks.db.select.mockReturnValue({ from });
}

function mockListChain(result: unknown[]) {
  const offset = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ offset });
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy });
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ innerJoin });
  mocks.db.select.mockReturnValue({ from });
}

function mockTransaction(): void {
  mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({ insert: mocks.db.insert, delete: mocks.db.delete }),
  );
}

async function expectErrorCode(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    throw new Error("Se esperaba un error");
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isBlockedBetween.mockResolvedValue(false);
});

const blocker = "b1";
const blocked = { id: "b2" };

describe("bloqueo", () => {
  it("bloquea y limpia las relaciones de seguimiento en ambas direcciones", async () => {
    mockSelectChain([blocked]);
    mocks.db.insert.mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
    const deleteFn = vi.fn().mockResolvedValue(undefined);
    mocks.db.delete.mockReturnValue({ where: deleteFn });
    mockTransaction();

    await expect(blockUser(blocker, "target")).resolves.toBeUndefined();
    expect(mocks.db.transaction).toHaveBeenCalled();
    expect(mocks.db.insert).toHaveBeenCalled();
    expect(mocks.db.delete).toHaveBeenCalled();
    // La transacción debe eliminar userFollow en ambas direcciones
    expect(deleteFn).toHaveBeenCalled();
  });

  it("rechaza bloquear el propio perfil", async () => {
    mockSelectChain([{ id: "b1" }]);
    await expectErrorCode(blockUser("b1", "b1"), "RELATION_INVALID");
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("es idempotente si el bloqueo ya existe", async () => {
    mockSelectChain([blocked]);
    mocks.isBlockedBetween.mockResolvedValue(true);
    await expect(blockUser(blocker, "target")).resolves.toBeUndefined();
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("lanza USER_NOT_FOUND si el destino no existe", async () => {
    mockSelectChain([]);
    await expectErrorCode(blockUser(blocker, "ghost"), "USER_NOT_FOUND");
  });

  it("desbloquea eliminando el bloqueo", async () => {
    mockSelectChain([blocked]);
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    await expect(unblockUser(blocker, "target")).resolves.toBeUndefined();
    expect(mocks.db.delete).toHaveBeenCalled();
  });

  it("lista los bloqueos del usuario", async () => {
    mockListChain([{ user: { id: "b2", username: "target", displayName: null, profileVisibility: "private" } }]);
    const result = await listBlocks(blocker, 1, 20);
    expect(result.users).toHaveLength(1);
    expect(result.users[0]!.username).toBe("target");
  });
});