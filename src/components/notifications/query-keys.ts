import type { NotificationsResponse } from "@/lib/api/schemas";

/**
 * Claves de TanStack Query de la bandeja. Sin la zona horaria dentro de la
 * clave: cambia solo por cookie y lo que altera es el corte de los seguidores
 * por día, no el conjunto de entradas. Sirven para invalidar desde cualquier
 * componente (campana, panel, página) aunque conozcan la clave completa.
 */
export const NOTIFICATIONS_COUNT_KEY = ["notifications", "count"] as const;
export const NOTIFICATIONS_LIST_KEY = ["notifications", "list"] as const;

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
