import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn(), delete: vi.fn() } }));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/db/schema", () => ({
  session: {
    id: "session.id",
    userId: "session.userId",
    deviceLabel: "session.deviceLabel",
    createdAt: "session.createdAt",
    lastSeenAt: "session.lastSeenAt",
    expiresAt: "session.expiresAt",
  },
}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions) => ({ conditions })),
  eq: vi.fn((field, value) => ({ field, value })),
  gt: vi.fn((field, value) => ({ field, value })),
}));

import { listMySessions, revokeSession } from "./session-list";

const day = 24 * 60 * 60 * 1000;
const now = Date.now();

function rows(list: unknown[]) {
  mocks.db.select.mockReturnValue({ from: () => ({ where: vi.fn().mockResolvedValue(list) }) });
}

beforeEach(() => vi.clearAllMocks());

describe("listMySessions", () => {
  it("pone la actual primero y ordena el resto por actividad más reciente", async () => {
    rows([
      { id: "viejo", deviceLabel: "Firefox · Linux", createdAt: new Date(now - 19 * day), lastSeenAt: new Date(now - 19 * day) },
      { id: "actual", deviceLabel: "Chrome · Windows", createdAt: new Date(now - 30 * day), lastSeenAt: new Date(now) },
      { id: "reciente", deviceLabel: "Safari · iPhone", createdAt: new Date(now - 30 * day), lastSeenAt: new Date(now - 2 * day) },
    ]);
    const result = await listMySessions("user-1", "actual");
    expect(result.map((item) => item.id)).toEqual(["actual", "reciente", "viejo"]);
    expect(result.map((item) => item.current)).toEqual([true, false, false]);
  });

  it("usa el inicio como actividad cuando la sesión es anterior al registro de actividad", async () => {
    rows([
      { id: "sin-actividad", deviceLabel: null, createdAt: new Date(now - 5 * day), lastSeenAt: null },
      { id: "con-actividad", deviceLabel: "Edge · Windows", createdAt: new Date(now - 9 * day), lastSeenAt: new Date(now - 1 * day) },
      { id: "actual", deviceLabel: null, createdAt: new Date(now), lastSeenAt: null },
    ]);
    const result = await listMySessions("user-1", "actual");
    expect(result.map((item) => item.id)).toEqual(["actual", "con-actividad", "sin-actividad"]);
    expect(result[2]?.deviceLabel).toBeNull();
  });

  it("no expone tokens ni hashes", async () => {
    rows([{ id: "s", deviceLabel: null, createdAt: new Date(), lastSeenAt: null }]);
    const [item] = await listMySessions("user-1", "s");
    expect(Object.keys(item!).sort()).toEqual(["createdAt", "current", "deviceLabel", "id", "lastSeenAt"]);
  });
});

describe("revokeSession", () => {
  it("cierra una sesión propia que no es la actual", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "otra" }]);
    mocks.db.delete.mockReturnValue({ where: () => ({ returning }) });
    await expect(revokeSession("user-1", "otra", "actual")).resolves.toBeUndefined();
    expect(returning).toHaveBeenCalledOnce();
  });

  it("rechaza cerrar la sesión actual sin tocar la base", async () => {
    await expect(revokeSession("user-1", "actual", "actual")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.db.delete).not.toHaveBeenCalled();
  });

  it("responde no encontrada cuando la sesión es de otra persona o no existe", async () => {
    mocks.db.delete.mockReturnValue({ where: () => ({ returning: vi.fn().mockResolvedValue([]) }) });
    await expect(revokeSession("user-1", "ajena", "actual")).rejects.toMatchObject({
      code: "SESSION_NOT_FOUND",
      status: 404,
    });
  });
});
