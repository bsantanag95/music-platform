import { apiFetch } from "@/lib/api/client";
import {
  NotificationCountResponseSchema,
  NotificationsResponseSchema,
  OkResponseSchema,
  type NotificationTabValue,
  type NotificationsResponse,
} from "@/lib/api/schemas";

// Llamadas de la bandeja desde el cliente. El `tz` viaja en el listado, el
// contador y el "marcar leídas" porque la clave de un grupo de seguidores
// lleva el día local (openspec: add-notifications-core, D5 y D6). El `tab`
// separa "Para ti" de "Novedades" (add-notification-milestones-and-releases,
// D7).

function timeZoneQuery(timeZone: string | undefined): string {
  return timeZone ? `?tz=${encodeURIComponent(timeZone)}` : "";
}

export async function fetchNotificationCount(timeZone?: string) {
  return apiFetch(
    `/api/me/notifications/count${timeZoneQuery(timeZone)}`,
    NotificationCountResponseSchema,
  );
}

export async function fetchNotificationPage(
  options: {
    cursor?: string | null;
    timeZone?: string;
    tab?: NotificationTabValue;
  } = {},
): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.timeZone) params.set("tz", options.timeZone);
  if (options.tab && options.tab !== "for_you") params.set("tab", options.tab);
  const query = params.toString();
  return apiFetch(
    `/api/me/notifications${query ? `?${query}` : ""}`,
    NotificationsResponseSchema,
  );
}

/**
 * Abrir la campana o la página: el contador vuelve a 0, no las leídas. Abrir
 * "Novedades" mueve su propia marca (el punto), no la de "Para ti".
 */
export async function markNotificationsSeen(
  tab: NotificationTabValue = "for_you",
): Promise<void> {
  const query = tab === "releases" ? "?tab=releases" : "";
  await apiFetch(`/api/me/notifications/seen${query}`, OkResponseSchema, { method: "PUT" });
}

export async function markNotificationsRead(
  body: { all: true } | { groupKeys: string[] },
  timeZone?: string,
): Promise<void> {
  await apiFetch(`/api/me/notifications/read${timeZoneQuery(timeZone)}`, OkResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
