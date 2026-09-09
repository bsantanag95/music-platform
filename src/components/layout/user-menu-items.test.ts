import { describe, expect, it } from "vitest";
import commonEs from "../../../messages/es/common.json";
import commonEn from "../../../messages/en/common.json";
import {
  USER_MENU_ITEMS,
  buildUserMenuItems,
} from "./user-menu-items";

describe("user-menu-items", () => {
  it("cada labelKey resuelve en common de es y en", () => {
    for (const item of USER_MENU_ITEMS) {
      expect(commonEs, `es.common.${item.labelKey}`).toHaveProperty(item.labelKey);
      expect(commonEn, `en.common.${item.labelKey}`).toHaveProperty(item.labelKey);
    }
  });

  it("common tiene la cadena de solicitudes pendientes en ambos locales", () => {
    expect(commonEs).toHaveProperty("pendingFollowRequests");
    expect(commonEn).toHaveProperty("pendingFollowRequests");
  });

  it("la superficie header incluye el perfil propio y el feed", () => {
    const ids = buildUserMenuItems({ username: "ana", surface: "header" }).map((i) => i.id);
    expect(ids).toContain("profile");
    expect(ids).toContain("feed");
  });

  it("la superficie panel excluye el perfil propio y el feed, e incluye bloqueos", () => {
    const ids = buildUserMenuItems({ surface: "panel" }).map((i) => i.id);
    expect(ids).not.toContain("profile");
    expect(ids).not.toContain("feed");
    expect(ids).toContain("blocks");
  });

  it("sustituye :username solo en el enlace al perfil propio", () => {
    const items = buildUserMenuItems({ username: "an a", surface: "header" });
    expect(items.find((i) => i.id === "profile")?.href).toBe("/users/an%20a");
    expect(items.find((i) => i.id === "diary")?.href).toBe("/me/diary");
  });

  it("adjunta el conteo al ítem con badge solo cuando es > 0", () => {
    const withPending = buildUserMenuItems({ surface: "panel", pendingFollowRequests: 2 });
    expect(withPending.find((i) => i.id === "followRequests")?.badgeCount).toBe(2);

    const none = buildUserMenuItems({ surface: "panel", pendingFollowRequests: 0 });
    expect(none.find((i) => i.id === "followRequests")?.badgeCount).toBeUndefined();
  });
});
