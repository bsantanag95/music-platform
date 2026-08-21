import { describe, expect, it, vi } from "vitest";
import { getOwnProfile, getProfileByUsername, searchUsers, updateProfileVisibility } from "./profiles";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), update: vi.fn() },
  getRelationBetween: vi.fn(),
  relationsFor: vi.fn(),
  isBlocking: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./relations", () => ({
  getRelationBetween: mocks.getRelationBetween,
  relationsFor: mocks.relationsFor,
  isBlocking: mocks.isBlocking,
}));

function mockSelectChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  mocks.db.select.mockReturnValue({ from });
}

function mockSearchChain(result: unknown[]) {
  const offset = vi.fn().mockResolvedValue(result);
  const limit = vi.fn().mockReturnValue({ offset });
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy });
  const from = vi.fn().mockReturnValue({ where });
  mocks.db.select.mockReturnValue({ from });
}

function mockUpdateChain(result: unknown[]) {
  const returning = vi.fn().mockResolvedValue(result);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  mocks.db.update.mockReturnValue({ set });
}

async function expectErrorCode(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    throw new Error("Se esperaba un error");
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

const baseUser = {
  id: "u1",
  username: "ana",
  displayName: "Ana",
  email: "ana@example.com",
  profileVisibility: "public",
};

describe("perfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isBlocking.mockResolvedValue(false);
  });

  it("obtiene el perfil propio con email", async () => {
    mockSelectChain([baseUser]);
    const result = await getOwnProfile("u1");
    expect(result).toEqual({
      id: "u1",
      username: "ana",
      displayName: "Ana",
      email: "ana@example.com",
      profileVisibility: "public",
    });
  });

  it("lanza USER_NOT_FOUND si el perfil propio no existe", async () => {
    mockSelectChain([]);
    await expectErrorCode(getOwnProfile("missing"), "USER_NOT_FOUND");
  });

  it("valida la visibilidad antes de actualizar", async () => {
    await expectErrorCode(updateProfileVisibility("u1", "invalid" as never), "VALIDATION_ERROR");
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("persiste un cambio de visibilidad", async () => {
    mockUpdateChain([{ ...baseUser, profileVisibility: "private" }]);
    const result = await updateProfileVisibility("u1", "private");
    expect(result.profileVisibility).toBe("private");
  });

  it("expone el perfil público con la relación del visitante", async () => {
    mockSelectChain([{ ...baseUser, email: undefined }]);
    mocks.getRelationBetween.mockResolvedValue("following");
    const result = await getProfileByUsername("ana", "viewer-1");
    expect(result).toMatchObject({
      username: "ana",
      profileVisibility: "public",
      relation: "following",
      blockedByMe: false,
      accessible: true,
    });
  });

  it("marca blockedByMe cuando el visitante bloqueó al dueño", async () => {
    mockSelectChain([{ ...baseUser, email: undefined }]);
    mocks.getRelationBetween.mockResolvedValue("blocked");
    mocks.isBlocking.mockResolvedValue(true);
    const result = await getProfileByUsername("ana", "viewer-1");
    expect(result.relation).toBe("blocked");
    expect(result.blockedByMe).toBe(true);
  });

  it("no ofrece desbloquear cuando el visitante fue bloqueado por el dueño", async () => {
    mockSelectChain([{ ...baseUser, email: undefined }]);
    mocks.getRelationBetween.mockResolvedValue("blocked");
    mocks.isBlocking.mockResolvedValue(false);
    const result = await getProfileByUsername("ana", "viewer-1");
    expect(result.relation).toBe("blocked");
    expect(result.blockedByMe).toBe(false);
  });

  it("no expone contenido no mínimo de un perfil privado a un visitante", async () => {
    mockSelectChain([{ ...baseUser, id: "u1", profileVisibility: "private" }]);
    mocks.getRelationBetween.mockResolvedValue("none");
    const result = await getProfileByUsername("ana", "viewer-1");
    expect(result.profileVisibility).toBe("private");
    expect(result.accessible).toBe(false);
    expect(result).not.toHaveProperty("email");
  });

  it("lanza USER_NOT_FOUND si el username no existe", async () => {
    mockSelectChain([]);
    await expectErrorCode(getProfileByUsername("ghost", null), "USER_NOT_FOUND");
  });

  it("busca usuarios y resuelve la relación por lote", async () => {
    mockSearchChain([
      { id: "u1", username: "ana", displayName: null, profileVisibility: "public" },
      { id: "u2", username: "andre", displayName: null, profileVisibility: "private" },
    ]);
    mocks.relationsFor.mockResolvedValue(new Map([["u1", "following"], ["u2", "requested"]]));

    const result = await searchUsers("an", "viewer-1", 1, 20);
    expect(result.users).toHaveLength(2);
    expect(result.users[0]).toMatchObject({ username: "ana", relation: "following" });
    expect(result.users[1]).toMatchObject({ username: "andre", relation: "requested" });
    expect(result.hasNext).toBe(false);
  });

  it("exige un término de búsqueda", async () => {
    await expectErrorCode(searchUsers("   ", null, 1, 20), "VALIDATION_ERROR");
  });
});