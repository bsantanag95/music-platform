import { describe, expect, it, vi } from "vitest";
import { getPermissionsForRoles } from "./permissions";
import { getUserPermissions } from "./authorization";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  resolveSession: vi.fn(),
}));

vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/db", () => ({ db: { select: mocks.select } }));

describe("permisos de plataforma", () => {
  it("combina roles acumulables sin duplicar permisos", () => {
    expect(getPermissionsForRoles(["moderator", "admin"])).toEqual([
      "moderation.review_content",
      "moderation.suspend_social",
      "editorial.publish",
      "platform.manage_roles",
    ]);
  });

  it("no concede permisos a roles desconocidos", () => {
    expect(getPermissionsForRoles(["user", "unknown"])).toEqual([]);
  });
});

describe("permisos por solicitud (revocación de roles)", () => {
  it("la revocación de un rol elimina el acceso en la siguiente consulta", async () => {
    const where = vi.fn().mockResolvedValue([{ role: "admin" }]);
    mocks.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where }) });

    const withRole = await getUserPermissions("u1");
    expect(withRole).toEqual(
      expect.arrayContaining(["editorial.publish", "platform.manage_roles"]),
    );

    // El rol se revoca: la siguiente resolución ya no concede nada.
    where.mockResolvedValue([]);
    expect(await getUserPermissions("u1")).toEqual([]);
  });
});