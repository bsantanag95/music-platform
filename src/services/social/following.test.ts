import { describe, expect, it, vi } from "vitest";
import {
  approveRequest,
  cancelRequest,
  countPendingFollowRequests,
  followUser,
  listFollowers,
  listFollowRequests,
  listFollowing,
  rejectRequest,
  removeFollower,
  unfollowUser,
} from "./following";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
  isBlockedBetween: vi.fn(),
}));
const emitMocks = vi.hoisted(() => ({
  emitNotifications: vi.fn().mockResolvedValue(undefined),
  retractFollowRequestNotifications: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./relations", () => ({ isBlockedBetween: mocks.isBlockedBetween }));
vi.mock("@/services/notifications/emit", () => emitMocks);

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

function mockInsertFollow(result: unknown[] = [{ id: "r1" }]) {
  const returning = vi.fn().mockResolvedValue(result);
  const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  mocks.db.insert.mockReturnValue({ values });
  return { values, returning };
}

function mockUpdateDelete(): void {
  const whereResult = Object.assign(Promise.resolve(undefined), {
    returning: vi.fn().mockResolvedValue([]),
  });
  mocks.db.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn(() => whereResult) }) });
  mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
}

function mockTransaction(): void {
  mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({ insert: mocks.db.insert, update: mocks.db.update, delete: mocks.db.delete }),
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
  mocks.db.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({ insert: mocks.db.insert, update: mocks.db.update, delete: mocks.db.delete }),
  );
});

const follower = "f1";
const targetPublic = { id: "t1", profileVisibility: "public" };
const targetPrivate = { id: "t1", profileVisibility: "private" };

describe("seguimiento", () => {
  it("sigue un perfil público de forma inmediata", async () => {
    mockSelectChain([targetPublic]);
    mockInsertFollow();
    mockUpdateDelete();
    mockTransaction();

    const result = await followUser(follower, "target");
    expect(result).toEqual({ relation: "following" });
    expect(mocks.db.transaction).toHaveBeenCalled();
  });

  it("crea una solicitud pendiente para un perfil privado", async () => {
    mockSelectChain([targetPrivate]);
    mockInsertFollow();
    mockUpdateDelete();
    mockTransaction();

    const result = await followUser(follower, "target");
    expect(result).toEqual({ relation: "requested" });
  });

  it("emite new_follower al seguir un perfil público, con el id del seguimiento", async () => {
    mockSelectChain([targetPublic]);
    mockInsertFollow([{ id: "r7" }]);
    mockUpdateDelete();
    mockTransaction();

    await followUser(follower, "target");

    expect(emitMocks.emitNotifications).toHaveBeenCalledWith(
      expect.anything(),
      [{ kind: "new_follower", recipientId: "t1", actorId: "f1", followId: "r7" }],
    );
    expect(emitMocks.retractFollowRequestNotifications).toHaveBeenCalledWith(expect.anything(), []);
  });

  it("emite follow_request al pedir seguir un perfil privado", async () => {
    mockSelectChain([targetPrivate]);
    mockInsertFollow([{ id: "r8" }]);
    mockUpdateDelete();
    mockTransaction();

    await followUser(follower, "target");

    expect(emitMocks.emitNotifications).toHaveBeenCalledWith(
      expect.anything(),
      [{ kind: "follow_request", recipientId: "t1", actorId: "f1", followId: "r8" }],
    );
  });

  it("consolidar un seguimiento mutuo no emite nada extra y retira la solicitud pendiente", async () => {
    mockSelectChain([targetPublic]);
    mockInsertFollow([{ id: "r7" }]);
    const returning = vi.fn().mockResolvedValue([{ id: "r9" }]);
    const where = vi.fn(() => Object.assign(Promise.resolve(undefined), { returning }));
    mocks.db.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where }) });
    mockTransaction();

    await followUser(follower, "target");

    expect(emitMocks.emitNotifications).toHaveBeenCalledTimes(1);
    expect(emitMocks.emitNotifications).toHaveBeenCalledWith(
      expect.anything(),
      [{ kind: "new_follower", recipientId: "t1", actorId: "f1", followId: "r7" }],
    );
    expect(emitMocks.retractFollowRequestNotifications).toHaveBeenCalledWith(expect.anything(), ["r9"]);
  });

  it("rechaza seguir el propio perfil", async () => {
    mockSelectChain([targetPublic]);
    await expectErrorCode(followUser("t1", "target"), "RELATION_INVALID");
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });

  it("rechaza seguir si existe un bloqueo", async () => {
    mocks.isBlockedBetween.mockResolvedValue(true);
    mockSelectChain([targetPublic]);
    await expectErrorCode(followUser(follower, "target"), "BLOCKED");
  });

  it("lanza USER_NOT_FOUND si el destino no existe", async () => {
    mockSelectChain([]);
    await expectErrorCode(followUser(follower, "ghost"), "USER_NOT_FOUND");
  });

  it("dejar de seguir elimina la relación", async () => {
    mockSelectChain([targetPublic]);
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const result = await unfollowUser(follower, "target");
    expect(result).toEqual({ relation: "none" });
    expect(mocks.db.delete).toHaveBeenCalled();
  });

  it("aprueba una solicitud recibida", async () => {
    mockSelectChain([{ id: "r1", followerId: "f1", followedId: "t1", status: "pending" }]);
    mocks.db.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });

    await expect(approveRequest("t1", "f1")).resolves.toBeUndefined();
    expect(mocks.db.update).toHaveBeenCalled();
  });

  it("aprobar emite follow_accepted a quien pidió y retira su solicitud, en una transacción", async () => {
    mockSelectChain([{ id: "r1", followerId: "f1", followedId: "t1", status: "pending" }]);
    mocks.db.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) });

    await approveRequest("t1", "f1");

    expect(mocks.db.transaction).toHaveBeenCalledTimes(1);
    expect(emitMocks.retractFollowRequestNotifications).toHaveBeenCalledWith(expect.anything(), ["r1"]);
    expect(emitMocks.emitNotifications).toHaveBeenCalledWith(
      expect.anything(),
      [{ kind: "follow_accepted", recipientId: "f1", actorId: "t1", followId: "r1" }],
    );
  });

  it("no aprueba ni emite nada si la solicitud no existe", async () => {
    mockSelectChain([]);

    await expectErrorCode(approveRequest("t1", "f1"), "REQUEST_NOT_FOUND");
    expect(emitMocks.emitNotifications).not.toHaveBeenCalled();
  });

  it("no aprueba una solicitud inexistente o ya resuelta", async () => {
    mockSelectChain([]);
    await expectErrorCode(approveRequest("t1", "f1"), "REQUEST_NOT_FOUND");
  });

  it("rechaza una solicitud recibida", async () => {
    mockSelectChain([{ id: "r1", followerId: "f1", followedId: "t1", status: "pending" }]);
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });

    await expect(rejectRequest("t1", "f1")).resolves.toBeUndefined();
    expect(mocks.db.delete).toHaveBeenCalled();
  });

  it("cancela una solicitud enviada", async () => {
    mockSelectChain([targetPublic]);
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });

    await expect(cancelRequest(follower, "target")).resolves.toBeUndefined();
    expect(mocks.db.delete).toHaveBeenCalled();
  });

  it("elimina un seguidor propio", async () => {
    mocks.db.delete.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    await expect(removeFollower("t1", "f1")).resolves.toBeUndefined();
    expect(mocks.db.delete).toHaveBeenCalled();
  });

  it("lista seguidores, seguidos y solicitudes con paginación", async () => {
    mockListChain([{ user: { id: "f1", username: "ana", displayName: null, profileVisibility: "public" } }]);

    const followers = await listFollowers("t1", 1, 20);
    expect(followers.users).toHaveLength(1);
    expect(followers.users[0]!.username).toBe("ana");
    expect(followers.hasNext).toBe(false);

    const following = await listFollowing("f1", 1, 20);
    expect(following.users).toHaveLength(1);

    const requests = await listFollowRequests("t1", 1, 20);
    expect(requests.users).toHaveLength(1);
  });

  it("cuenta las solicitudes de seguimiento pendientes recibidas", async () => {
    const where = vi.fn().mockResolvedValue([{ count: 3 }]);
    // from().innerJoin(app_user).where(): solo cuenta solicitudes de cuentas activas.
    const from = vi.fn().mockReturnValue({ innerJoin: vi.fn().mockReturnValue({ where }) });
    mocks.db.select.mockReturnValue({ from });

    await expect(countPendingFollowRequests("t1")).resolves.toBe(3);
  });

  it("devuelve 0 cuando no hay solicitudes pendientes", async () => {
    const where = vi.fn().mockResolvedValue([]);
    const from = vi.fn().mockReturnValue({ innerJoin: vi.fn().mockReturnValue({ where }) });
    mocks.db.select.mockReturnValue({ from });

    await expect(countPendingFollowRequests("t1")).resolves.toBe(0);
  });
});