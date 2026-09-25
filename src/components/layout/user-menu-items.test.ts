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

  it("sustituye :username en perfil, seguidos y seguidores; el resto no lo necesita", () => {
    const items = buildUserMenuItems({ username: "an a", surface: "header" });
    expect(items.find((i) => i.id === "profile")?.href).toBe("/users/an%20a");
    expect(items.find((i) => i.id === "followers")?.href).toBe("/users/an%20a/connections/followers");
    expect(items.find((i) => i.id === "following")?.href).toBe("/users/an%20a/connections/following");
    expect(items.find((i) => i.id === "diary")?.href).toBe("/me/diary");
  });

  it("la superficie panel también sustituye :username en seguidos y seguidores", () => {
    const items = buildUserMenuItems({ username: "ana", surface: "panel" });
    expect(items.find((i) => i.id === "followers")?.href).toBe("/users/ana/connections/followers");
    expect(items.find((i) => i.id === "following")?.href).toBe("/users/ana/connections/following");
  });

  it("adjunta el conteo al ítem con badge solo cuando es > 0", () => {
    const withPending = buildUserMenuItems({ surface: "panel", pendingFollowRequests: 2 });
    expect(withPending.find((i) => i.id === "followRequests")?.badgeCount).toBe(2);

    const none = buildUserMenuItems({ surface: "panel", pendingFollowRequests: 0 });
    expect(none.find((i) => i.id === "followRequests")?.badgeCount).toBeUndefined();
  });

  it("la superficie settings reúne solo los destinos de red y los bloqueos", () => {
    const ids = buildUserMenuItems({ username: "ana", surface: "settings" }).map((i) => i.id);
    expect(ids).toEqual(["followers", "following", "followRequests", "blocks"]);
  });

  it("la superficie settings sustituye :username y adjunta el conteo de solicitudes", () => {
    const items = buildUserMenuItems({ username: "ana", surface: "settings", pendingFollowRequests: 3 });
    expect(items.find((i) => i.id === "followers")?.href).toBe("/users/ana/connections/followers");
    expect(items.find((i) => i.id === "followRequests")?.badgeCount).toBe(3);
  });

  it("los destinos de biblioteca y ajustes no aparecen en la superficie settings", () => {
    const ids = buildUserMenuItems({ username: "ana", surface: "settings" }).map((i) => i.id);
    for (const id of ["diary", "favorites", "lists", "collection", "settings", "profile", "feed"]) {
      expect(ids).not.toContain(id);
    }
  });

  it("las superficies header y panel conservan los mismos destinos de red", () => {
    for (const surface of ["header", "panel"] as const) {
      const ids = buildUserMenuItems({ username: "ana", surface }).map((i) => i.id);
      expect(ids).toEqual(expect.arrayContaining(["followers", "following", "followRequests"]));
    }
  });

  it("las herramientas de rol solo aparecen con el permiso, en un grupo antes de la cuenta", () => {
    const none = buildUserMenuItems({ username: "ana", surface: "header" }).map((i) => i.id);
    expect(none).not.toContain("moderation");
    expect(none).not.toContain("administration");

    const items = buildUserMenuItems({
      username: "ana",
      surface: "header",
      permissions: ["moderation.suspend_social", "editorial.author"],
    });
    const ids = items.map((i) => i.id);
    expect(ids.slice(-3)).toEqual(["moderation", "administration", "settings"]);
    expect(items.find((i) => i.id === "moderation")).toMatchObject({ href: "/moderation", group: "tools" });

    const panel = buildUserMenuItems({ surface: "panel", permissions: ["editorial.author"] }).map((i) => i.id);
    expect(panel).toContain("administration");
    expect(panel).not.toContain("moderation");

    const settings = buildUserMenuItems({ surface: "settings", permissions: ["editorial.author"] }).map((i) => i.id);
    expect(settings).not.toContain("administration");
  });
});
