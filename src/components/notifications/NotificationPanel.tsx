"use client";

import { useId, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTimeZone, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type {
  NotificationTabValue,
  NotificationsResponse,
} from "@/lib/api/schemas";
import { fetchNotificationPage, markNotificationsRead, markNotificationsSeen } from "./api";
import { NotificationRow } from "./NotificationRow";
import { NotificationTabs } from "./NotificationTabs";
import {
  NOTIFICATIONS_COUNT_KEY,
  NOTIFICATIONS_LIST_PREFIX,
  notificationListKey,
} from "./query-keys";

/** El panel muestra las diez entradas más recientes; "Ver todas" lleva a la página. */
const PANEL_LIMIT = 10;

interface NotificationPanelProps {
  /** `id` del contenedor, para `aria-controls` del disparador. */
  id?: string;
  /** Punto de "Novedades" que ya trae el contador de la campana. */
  newReleases: boolean;
  onNavigate?: () => void;
}

// Panel desplegable de la campana en escritorio (openspec: add-notifications-core,
// D8; add-notification-milestones-and-releases, D8). Solo se monta al abrirse,
// así cada apertura trae datos frescos y no hay una consulta viva con el panel
// cerrado. Cada pestaña tiene su propia consulta y su propio estado vacío.
export function NotificationPanel({ id, newReleases, onNavigate }: NotificationPanelProps) {
  const t = useTranslations("notifications");
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();
  const panelId = useId();
  const [tab, setTab] = useState<NotificationTabValue>("for_you");
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: notificationListKey(tab),
    queryFn: () => fetchNotificationPage({ timeZone, tab }),
    staleTime: 0,
  });

  const groups = data?.groups.slice(0, PANEL_LIMIT) ?? [];
  const hasUnread = data?.groups.some((group) => group.unread) ?? false;

  // Abrir "Novedades" apaga el punto en el acto y mueve solo su marca (D7).
  const changeTab = (next: NotificationTabValue) => {
    setTab(next);
    if (next !== "releases") return;
    queryClient.setQueryData<{ count: number; newReleases: boolean } | undefined>(
      NOTIFICATIONS_COUNT_KEY,
      (current) => (current ? { ...current, newReleases: false } : current),
    );
    void markNotificationsSeen("releases").catch(() => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_COUNT_KEY });
    });
  };

  const markAllRead = async () => {
    setMarking(true);
    setMarkError(false);
    try {
      await markNotificationsRead({ all: true }, timeZone);
      // El servidor marca las filas de las dos pestañas: el caché las refleja.
      queryClient.setQueriesData<NotificationsResponse | undefined>(
        { queryKey: NOTIFICATIONS_LIST_PREFIX },
        (page) =>
          page
            ? { ...page, groups: page.groups.map((group) => ({ ...group, unread: false })) }
            : page,
      );
      queryClient.setQueryData(NOTIFICATIONS_COUNT_KEY, { count: 0, newReleases: false });
    } catch {
      setMarkError(true);
    } finally {
      setMarking(false);
    }
  };

  // Resolver una solicitud la hace desaparecer: se quita ya de la lista y se
  // refresca el contador (la fila de `follow_request` cae en el servidor).
  const removeGroup = (groupId: string) => {
    queryClient.setQueryData<NotificationsResponse | undefined>(
      notificationListKey(tab),
      (page) =>
        page ? { ...page, groups: page.groups.filter((group) => group.id !== groupId) } : page,
    );
    void queryClient.invalidateQueries({ queryKey: notificationListKey(tab) });
  };

  return (
    <section
      id={id}
      aria-label={t("bell.label")}
      className="overflow-hidden rounded-lg border border-ink-border bg-ink-surface shadow-xl shadow-black/50"
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink-border px-4 py-2.5">
        <h2 className="font-display text-sm text-paper">{t("bell.label")}</h2>
        <Link
          href="/me/notifications"
          onClick={onNavigate}
          className="font-data text-xs text-amber underline underline-offset-2 hover:text-amber-hover"
        >
          {t("bell.seeAll")}
        </Link>
      </div>

      <div className="px-4 pt-1.5">
        <NotificationTabs
          active={tab}
          newReleases={newReleases}
          onChange={changeTab}
          label={t("tabs.label")}
          panelId={panelId}
        />
      </div>

      <div
        id={`${panelId}-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-${tab}`}
        className="themed-scrollbar max-h-[26rem] overflow-y-auto"
      >
        {isLoading ? (
          <p className="px-4 py-6 text-center font-body text-sm text-paper-muted">
            {t("bell.loading")}
          </p>
        ) : isError ? (
          <p role="alert" className="px-4 py-6 text-center font-body text-sm text-danger">
            {t("bell.error")}
          </p>
        ) : groups.length === 0 ? (
          <p className="px-4 py-6 text-center font-body text-sm text-paper-muted">
            {tab === "releases" ? t("panel.emptyReleases") : t("bell.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-ink-border">
            {groups.map((group) => (
              <NotificationRow
                key={group.id}
                group={group}
                onNavigate={onNavigate}
                onResolved={() => removeGroup(group.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-1 border-t border-ink-border px-4 py-2.5">
        <button
          type="button"
          disabled={!hasUnread || marking}
          onClick={() => void markAllRead()}
          className="self-start font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
        >
          {marking ? t("bell.markAllReadPending") : t("bell.markAllRead")}
        </button>
        {markError ? (
          <span role="alert" className="font-data text-xs text-danger">
            {t("bell.actionError")}
          </span>
        ) : null}
      </div>
    </section>
  );
}
