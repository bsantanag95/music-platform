import { ApiError } from "@/lib/api/errors";
import { NOTIFICATION_TABS, type NotificationTab } from "@/db/schema";

// `tab` opcional de la bandeja (openspec:
// add-notification-milestones-and-releases, D7). Ausente → "Para ti"
// (compatible con la Fase 1); presente pero desconocido → 400, en vez de
// devolver otra pestaña en silencio.
export function parseNotificationTabParam(searchParams: URLSearchParams): NotificationTab {
  const value = searchParams.get("tab");
  if (value === null) return "for_you";
  if (!(NOTIFICATION_TABS as readonly string[]).includes(value)) {
    throw new ApiError("VALIDATION_ERROR", 400, 'El valor de "tab" no es válido');
  }
  return value as NotificationTab;
}
