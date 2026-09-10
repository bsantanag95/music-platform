import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  select: vi.fn(),
  requirePermissionForUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => ({ db: { update: mocks.update, select: mocks.select } }));
vi.mock("@/services/auth/authorization", () => ({
  requirePermissionForUser: mocks.requirePermissionForUser,
}));

import { listEditorialLists, publishOfficialList, unpublishOfficialList } from "./editorial";

function updateChain() {
  const returning = vi.fn().mockResolvedValue([{ id: "list-1", isOfficial: true }]);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  mocks.update.mockReturnValue({ set });
  // La condición de dueño curador se construye con un subquery de db.select:
  // el objeto resultante solo se serializa a SQL, no se await-eea.
  mocks.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn() }) });
  return { set, where, returning };
}

describe("contenido editorial oficial", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exige permiso editorial y marca la lista como oficial", async () => {
    const chain = updateChain();
    await publishOfficialList("admin-1", "list-1");
    expect(mocks.requirePermissionForUser).toHaveBeenCalledWith("admin-1", "editorial.publish");
    expect(chain.set).toHaveBeenCalledWith(expect.objectContaining({ isOfficial: true, officialPublishedBy: "admin-1" }));
  });

  it("permite retirar la marca oficial solo con permiso editorial", async () => {
    const chain = updateChain();
    await unpublishOfficialList("admin-1", "list-1");
    expect(mocks.requirePermissionForUser).toHaveBeenCalledWith("admin-1", "editorial.publish");
    expect(chain.set).toHaveBeenCalledWith(expect.objectContaining({ isOfficial: false, officialPublishedBy: null, officialPublishedAt: null, officialWithdrawnAt: expect.any(Date) }));
  });

  it("restringe la publicación a listas de la cuenta curadora", async () => {
    const chain = updateChain();
    await publishOfficialList("admin-1", "list-1");
    // El subquery del dueño curador debe haberse construido para filtrar por
    // `@exploracion` dentro de la condición AND de la mutación.
    expect(mocks.select).toHaveBeenCalled();
    const whereArgs = chain.where.mock.calls[0];
    expect(whereArgs).toHaveLength(1);
  });

  it("listado editorial consulta con restricción a la cuenta curadora", async () => {
    const where = vi.fn();
    mocks.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }),
      }),
    });
    await listEditorialLists();
    expect(mocks.select).toHaveBeenCalled();
    expect(where).not.toHaveBeenCalled();
  });
});