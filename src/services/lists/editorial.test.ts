import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  requirePermissionForUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => ({ db: { update: mocks.update } }));
vi.mock("@/services/auth/authorization", () => ({
  requirePermissionForUser: mocks.requirePermissionForUser,
}));

import { publishOfficialList, unpublishOfficialList } from "./editorial";

function updateChain() {
  const returning = vi.fn().mockResolvedValue([{ id: "list-1", isOfficial: true }]);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  mocks.update.mockReturnValue({ set });
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
    expect(chain.set).toHaveBeenCalledWith({ isOfficial: false, officialPublishedBy: null, officialPublishedAt: null });
  });
});
