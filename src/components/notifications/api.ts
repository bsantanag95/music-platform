import { apiFetch } from "@/lib/api/client";
import {
  NotificationCountResponseSchema,
  NotificationsResponseSchema,
  OkResponseSchema,
  type NotificationsResponse,
} from "@/lib/api/schemas";

// Llamadas de la bandeja desde el cliente. El `tz` viaja en el listado, el
// contador y el "marcar leídas" porque la clave de un grupo de seguidores
// lleva el día local (openspec: add-notifications-core, D5 y D6).

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
  options: { cursor?: string | null; timeZone?: string } = {},
): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.timeZone) params.set("tz", options.timeZone);
  const query = params.toString();
  return apiFetch(
    `/api/me/notifications${query ? `?${query}` : ""}`,
    NotificationsResponseSchema,
  );
}

/** Abrir la campana o la página: el contador vuelve a 0, no las leídas. */
export async function markNotificationsSeen(): Promise<void> {
  await apiFetch("/api/me/notifications/seen", OkResponseSchema, { method: "PUT" });
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
