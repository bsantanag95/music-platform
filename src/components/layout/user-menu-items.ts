// Fuente única de los destinos de gestión del usuario autenticado. La consumen
// el menú de usuario del Header (`UserMenu`) y el panel del dueño en el perfil
// (`OwnerHubPanel`), de modo que ambos no puedan divergir. Ver spec
// cross-view-navigation ("Estructura del Header para el usuario autenticado") y
// social-profiles ("Panel del dueño").
//
// Sin JSX ni dependencias de React: son datos. Cada consumidor aporta su marcado.

/** Superficie donde aparece un destino. */
export type UserMenuSurface = "header" | "panel";

/** Bloque visual dentro del menú / panel; separa grupos con un divisor. */
export type UserMenuGroup = "identity" | "library" | "network" | "account";

export interface UserMenuItemDef {
  /** Identificador estable del ítem (para `key` de React y tests). */
  id: string;
  /**
   * Ruta destino. `:username` se sustituye por el username del usuario en
   * `buildUserMenuItems`.
   */
  href: string;
  /** Clave del namespace `common` de i18n con la etiqueta corta del ítem. */
  labelKey: string;
  group: UserMenuGroup;
  /** Superficies donde se muestra. Por defecto, ambas. */
  surfaces: readonly UserMenuSurface[];
  /** Si está presente, el ítem recibe un contador (bandeja de entrada). */
  badge?: "pendingFollowRequests";
}

const BOTH: readonly UserMenuSurface[] = ["header", "panel"];

// El orden del array es el orden de presentación.
export const USER_MENU_ITEMS: readonly UserMenuItemDef[] = [
  { id: "profile", href: "/users/:username", labelKey: "profile", group: "identity", surfaces: ["header"] },

  { id: "diary", href: "/me/diary", labelKey: "diary", group: "library", surfaces: BOTH },
  { id: "favorites", href: "/me/favorites", labelKey: "favorites", group: "library", surfaces: BOTH },
  { id: "lists", href: "/me/lists", labelKey: "lists", group: "library", surfaces: BOTH },
  { id: "collection", href: "/me/collection", labelKey: "collection", group: "library", surfaces: BOTH },
  { id: "artists", href: "/me/artists", labelKey: "artists", group: "library", surfaces: BOTH },
  { id: "feed", href: "/me/feed", labelKey: "feed", group: "library", surfaces: ["header"] },

  { id: "followers", href: "/me/followers", labelKey: "followers", group: "network", surfaces: BOTH },
  { id: "following", href: "/me/following", labelKey: "following", group: "network", surfaces: BOTH },
  {
    id: "followRequests",
    href: "/me/follow-requests",
    labelKey: "followRequests",
    group: "network",
    surfaces: BOTH,
    badge: "pendingFollowRequests",
  },

  { id: "blocks", href: "/me/blocks", labelKey: "blocks", group: "account", surfaces: ["panel"] },
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
   * Username del usuario, para resolver el enlace a su propio perfil. Solo lo
   * necesita la superficie `header` (el único destino con `:username`).
   */
  username?: string;
  /** Solicitudes de seguimiento pendientes recibidas. */
  pendingFollowRequests?: number;
  /** Superficie que consume la lista. */
  surface: UserMenuSurface;
}

/**
 * Resuelve `USER_MENU_ITEMS` para una superficie: filtra por `surface`,
 * sustituye `:username` y adjunta el conteo de solicitudes pendientes al ítem
 * con badge cuando es mayor que cero.
 */
export function buildUserMenuItems({
  username = "",
  pendingFollowRequests = 0,
  surface,
}: BuildUserMenuItemsOptions): ResolvedUserMenuItem[] {
  return USER_MENU_ITEMS.filter((item) => item.surfaces.includes(surface)).map((item) => ({
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
  "account",
];
