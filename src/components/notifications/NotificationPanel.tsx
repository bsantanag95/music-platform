"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTimeZone, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { NotificationsResponse } from "@/lib/api/schemas";
import { fetchNotificationPage, markNotificationsRead } from "./api";
import { NotificationRow } from "./NotificationRow";
import { NOTIFICATIONS_COUNT_KEY, NOTIFICATIONS_LIST_KEY } from "./query-keys";

/** El panel muestra las diez entradas más recientes; "Ver todas" lleva a la página. */
const PANEL_LIMIT = 10;

interface NotificationPanelProps {
  /** `id` del contenedor, para `aria-controls` del disparador. */
  id?: string;
  onNavigate?: () => void;
}

// Panel desplegable de la campana en escritorio (openspec: add-notifications-core,
// D8). Solo se monta al abrirse, así cada apertura trae datos frescos y no hay
// una consulta viva con el panel cerrado.
export function NotificationPanel({ id, onNavigate }: NotificationPanelProps) {
  const t = useTranslations("notifications");
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: NOTIFICATIONS_LIST_KEY,
    queryFn: () => fetchNotificationPage({ timeZone }),
    staleTime: 0,
  });

  const groups = data?.groups.slice(0, PANEL_LIMIT) ?? [];
  const hasUnread = data?.groups.some((group) => group.unread) ?? false;

  const markAllRead = async () => {
    setMarking(true);
    setMarkError(false);
    try {
      await markNotificationsRead({ all: true }, timeZone);
      queryClient.setQueryData<NotificationsResponse | undefined>(
        NOTIFICATIONS_LIST_KEY,
        (page) =>
          page
            ? { ...page, groups: page.groups.map((group) => ({ ...group, unread: false })) }
            : page,
      );
      queryClient.setQueryData(NOTIFICATIONS_COUNT_KEY, { count: 0 });
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
      NOTIFICATIONS_LIST_KEY,
      (page) =>
        page ? { ...page, groups: page.groups.filter((group) => group.id !== groupId) } : page,
    );
    void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_LIST_KEY });
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

      <div className="themed-scrollbar max-h-[26rem] overflow-y-auto">
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
            {t("bell.empty")}
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
