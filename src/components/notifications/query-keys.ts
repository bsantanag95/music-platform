import type { NotificationTabValue, NotificationsResponse } from "@/lib/api/schemas";

/**
 * Claves de TanStack Query de la bandeja. Sin la zona horaria dentro de la
 * clave: cambia solo por cookie y lo que altera es el corte de los seguidores
 * por día, no el conjunto de entradas. Cada pestaña tiene su propia página
 * (openspec: add-notification-milestones-and-releases, D8).
 */
export const NOTIFICATIONS_COUNT_KEY = ["notifications", "count"] as const;
export const NOTIFICATIONS_LIST_PREFIX = ["notifications", "list"] as const;

export function notificationListKey(tab: NotificationTabValue) {
  return [...NOTIFICATIONS_LIST_PREFIX, tab] as const;
}

/** "Para ti" es la pestaña por defecto de la Fase 1. */
export const NOTIFICATIONS_LIST_KEY = notificationListKey("for_you");

/** Marca una entrada como leída dentro de una página cacheada. */
export function markGroupReadInPage(
  page: NotificationsResponse | undefined,
  groupId: string,
): NotificationsResponse | undefined {
  if (!page) return page;
  return {
    ...page,
    groups: page.groups.map((group) =>
      group.id === groupId ? { ...group, unread: false } : group,
    ),
  };
}
