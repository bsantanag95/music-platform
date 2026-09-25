// Fuente única de los destinos de gestión del usuario autenticado. La consumen
// el menú de usuario del Header (`UserMenu`), el panel móvil del Header y la
// pantalla Red del área de ajustes (`/me/settings/network`), de modo que no
// puedan divergir. Ver spec cross-view-navigation ("Estructura del Header para
// el usuario autenticado"), social-profiles ("Panel del dueño") y
// owner-settings ("Pantalla Red").
//
// Sin JSX ni dependencias de React: son datos. Cada consumidor aporta su marcado.

import type { Permission } from "@/services/auth/authorization";

/**
 * Superficie donde aparece un destino: `header` (desplegable de escritorio),
 * `panel` (bloque de usuario del panel móvil del Header) y `settings`
 * (pantalla Red del área de ajustes).
 */
export type UserMenuSurface = "header" | "panel" | "settings";

/** Bloque visual dentro del menú / panel; separa grupos con un divisor. */
export type UserMenuGroup = "identity" | "library" | "network" | "tools" | "account";

export interface UserMenuItemDef {
  /** Identificador estable del ítem (para `key` de React y tests). */
  id: string;
  /**
   * Ruta destino. `:username` se sustituye por el username del usuario en
   * `buildUserMenuItems` — lo necesitan "profile", "followers" y "following",
   * en ambas superficies (la del panel debe pasar `username` explícitamente).
   */
  href: string;
  /** Clave del namespace `common` de i18n con la etiqueta corta del ítem. */
  labelKey: string;
  group: UserMenuGroup;
  /** Superficies donde se muestra. */
  surfaces: readonly UserMenuSurface[];
  /** Si está presente, el ítem recibe un contador (bandeja de entrada). */
  badge?: "pendingFollowRequests";
  /** Permisos de plataforma que habilitan el ítem (basta uno); sin él, se muestra siempre. */
  requires?: readonly Permission[];
}

const BOTH: readonly UserMenuSurface[] = ["header", "panel"];
const NETWORK: readonly UserMenuSurface[] = ["header", "panel", "settings"];

// El orden del array es el orden de presentación.
export const USER_MENU_ITEMS: readonly UserMenuItemDef[] = [
  { id: "profile", href: "/users/:username", labelKey: "profile", group: "identity", surfaces: ["header"] },

  { id: "diary", href: "/me/diary", labelKey: "diary", group: "library", surfaces: BOTH },
  { id: "favorites", href: "/me/favorites", labelKey: "favorites", group: "library", surfaces: BOTH },
  { id: "wantToListen", href: "/me/want-to-listen", labelKey: "wantToListen", group: "library", surfaces: BOTH },
  { id: "lists", href: "/me/lists", labelKey: "lists", group: "library", surfaces: BOTH },
  { id: "collection", href: "/me/collection", labelKey: "collection", group: "library", surfaces: BOTH },
  { id: "artists", href: "/me/artists", labelKey: "artists", group: "library", surfaces: BOTH },
  {
    id: "artistJourneys",
    href: "/me/artist-journeys",
    labelKey: "artistJourneys",
    group: "library",
    surfaces: BOTH,
  },
  { id: "caminos", href: "/me/caminos", labelKey: "caminos", group: "library", surfaces: BOTH },
  { id: "feed", href: "/me/feed", labelKey: "feed", group: "library", surfaces: ["header"] },

  {
    id: "followers",
    href: "/users/:username/connections/followers",
    labelKey: "followers",
    group: "network",
    surfaces: NETWORK,
  },
  {
    id: "following",
    href: "/users/:username/connections/following",
    labelKey: "following",
    group: "network",
    surfaces: NETWORK,
  },
  {
    id: "followRequests",
    href: "/me/follow-requests",
    labelKey: "followRequests",
    group: "network",
    surfaces: NETWORK,
    badge: "pendingFollowRequests",
  },

  // Herramientas de rol (openspec: fix-header-overflow): viven en el menú y no en la barra
  // general, que queda para navegación de contenido y así entra en una fila.
  {
    id: "moderation",
    href: "/moderation",
    labelKey: "moderation",
    group: "tools",
    surfaces: BOTH,
    requires: ["moderation.review_content", "moderation.suspend_social"],
  },
  {
    id: "administration",
    href: "/admin",
    labelKey: "administration",
    group: "tools",
    surfaces: BOTH,
    requires: ["editorial.author"],
  },

  {
    id: "blocks",
    href: "/me/blocks",
    labelKey: "blocks",
    group: "account",
    surfaces: ["panel", "settings"],
  },
  { id: "settings", href: "/me/settings", labelKey: "settings", group: "account", surfaces: BOTH },
] as const;

/** Un destino ya resuelto para una superficie concreta. */
export interface ResolvedUserMenuItem {
  id: string;
  href: string;
  labelKey: string;
  group: UserMenuGroup;
  /** Número de pendientes cuando el ítem tiene badge y el conteo es > 0. */
  badgeCount?: number;
}

interface BuildUserMenuItemsOptions {
  /**
   * Username del usuario, para resolver los destinos con `:username`
   * ("profile", "followers", "following"). Ambas superficies lo necesitan.
   */
  username?: string;
  /** Solicitudes de seguimiento pendientes recibidas. */
  pendingFollowRequests?: number;
  /** Superficie que consume la lista. */
  surface: UserMenuSurface;
  /** Permisos de plataforma del usuario, para los ítems con `requires`. */
  permissions?: readonly Permission[];
}

/**
 * Resuelve `USER_MENU_ITEMS` para una superficie: filtra por `surface` y permisos,
 * sustituye `:username` y adjunta el conteo de solicitudes pendientes al ítem
 * con badge cuando es mayor que cero.
 */
export function buildUserMenuItems({
  username = "",
  pendingFollowRequests = 0,
  surface,
  permissions = [],
}: BuildUserMenuItemsOptions): ResolvedUserMenuItem[] {
  return USER_MENU_ITEMS.filter(
    (item) =>
      item.surfaces.includes(surface) &&
      (!item.requires || item.requires.some((permission) => permissions.includes(permission))),
  ).map((item) => ({
    id: item.id,
    href: item.href.replace(":username", encodeURIComponent(username)),
    labelKey: item.labelKey,
    group: item.group,
    badgeCount:
      item.badge === "pendingFollowRequests" && pendingFollowRequests > 0
        ? pendingFollowRequests
        : undefined,
  }));
}

/** Grupos en orden de presentación, para insertar divisores entre bloques. */
export const USER_MENU_GROUP_ORDER: readonly UserMenuGroup[] = [
  "identity",
  "library",
  "network",
  "tools",
  "account",
];
