import { describe, expect, it } from "vitest";
import { getPermissionsForRoles } from "./permissions";

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
