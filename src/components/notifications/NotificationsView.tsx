"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTimeZone, useTranslations } from "next-intl";
import type { NotificationGroupValue, NotificationsResponse } from "@/lib/api/schemas";
import {
  fetchNotificationPage,
  markNotificationsRead,
  markNotificationsSeen,
} from "./api";
import { NotificationRow } from "./NotificationRow";
import { NOTIFICATIONS_COUNT_KEY } from "./query-keys";

interface NotificationsViewProps {
  /** Primera página resuelta en el servidor. */
  initial: NotificationsResponse;
}

// Lista de la página `/me/notifications` (openspec: add-notifications-core, D8).
// La primera página llega del servidor; "Cargar más" sigue el cursor y añade.
// Abrir la página cuenta como abrir la bandeja: el contador vuelve a 0 (D6),
// pero las entradas siguen sin leer hasta que se abren o se marcan todas.
export function NotificationsView({ initial }: NotificationsViewProps) {
  const t = useTranslations("notifications");
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();

  const [groups, setGroups] = useState<NotificationGroupValue[]>(initial.groups);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState(false);

  useEffect(() => {
    queryClient.setQueryData(NOTIFICATIONS_COUNT_KEY, { count: 0 });
    void markNotificationsSeen().catch(() => {
      // Si falla, el contador vuelve a su valor real en el próximo sondeo.
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_COUNT_KEY });
    });
  }, [queryClient]);

  const markOneRead = (groupId: string) => {
    setGroups((current) =>
      current.map((group) => (group.id === groupId ? { ...group, unread: false } : group)),
    );
  };

  const removeGroup = (groupId: string) => {
    setGroups((current) => current.filter((group) => group.id !== groupId));
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const next = await fetchNotificationPage({ cursor, timeZone });
      setGroups((current) => [...current, ...next.groups]);
      setCursor(next.nextCursor);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const markAllRead = async () => {
    setMarking(true);
    setMarkError(false);
    try {
      await markNotificationsRead({ all: true }, timeZone);
      setGroups((current) => current.map((group) => ({ ...group, unread: false })));
      queryClient.setQueryData(NOTIFICATIONS_COUNT_KEY, { count: 0 });
    } catch {
      setMarkError(true);
    } finally {
      setMarking(false);
    }
  };

  if (groups.length === 0) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-lg border border-ink-border bg-ink-surface px-5 py-8">
        <h2 className="font-display text-lg text-paper">{t("page.emptyTitle")}</h2>
        <p className="max-w-prose font-body text-sm text-paper-muted">{t("page.emptyDescription")}</p>
      </section>
    );
  }

  const hasUnread = groups.some((group) => group.unread);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        disabled={!hasUnread || marking}
        onClick={() => void markAllRead()}
        className="self-start rounded border border-ink-border px-3 py-1.5 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
      >
        {marking ? t("bell.markAllReadPending") : t("page.markAllRead")}
      </button>

      {markError ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("bell.actionError")}
        </p>
      ) : null}

      <ul className="divide-y divide-ink-border rounded-lg border border-ink-border bg-ink-surface">
        {groups.map((group) => (
          <NotificationRow
            key={group.id}
            group={group}
            onRead={() => markOneRead(group.id)}
            onResolved={() => removeGroup(group.id)}
          />
        ))}
      </ul>

      {loadError ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("page.error")}
        </p>
      ) : null}

      {cursor ? (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void loadMore()}
          className="self-center rounded border border-ink-border px-4 py-2 font-display text-sm text-paper-muted transition-colors hover:border-amber hover:text-paper disabled:cursor-wait disabled:opacity-60"
        >
          {loadingMore ? t("page.loadingMore") : t("page.loadMore")}
        </button>
      ) : null}
    </div>
  );
}
