"use client";

import { useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTimeZone, useTranslations } from "next-intl";
import type {
  NotificationGroupValue,
  NotificationTabValue,
  NotificationsResponse,
} from "@/lib/api/schemas";
import {
  fetchNotificationPage,
  markNotificationsRead,
  markNotificationsSeen,
} from "./api";
import { NotificationRow } from "./NotificationRow";
import { NotificationTabs } from "./NotificationTabs";
import { NOTIFICATIONS_COUNT_KEY } from "./query-keys";

interface NotificationsViewProps {
  /** Primera página de "Para ti" resuelta en el servidor. */
  initial: NotificationsResponse;
  /** Punto de "Novedades" resuelto en el servidor. */
  initialNewReleases?: boolean;
}

interface TabState {
  groups: NotificationGroupValue[];
  cursor: string | null;
  /** La pestaña ya trae su primera página (del servidor o del cliente). */
  loaded: boolean;
  loading: boolean;
  error: boolean;
}

function emptyTab(loaded = false): TabState {
  return { groups: [], cursor: null, loaded, loading: false, error: false };
}

// Lista de la página `/me/notifications` (openspec: add-notifications-core, D8;
// add-notification-milestones-and-releases, D8). "Para ti" llega resuelta del
// servidor; "Novedades" se pide al abrirla. Cada pestaña tiene su propio cursor,
// su "Cargar más" y su estado vacío. Abrir la página cuenta como abrir la
// bandeja (contador a 0); abrir "Novedades" mueve solo su marca.
export function NotificationsView({ initial, initialNewReleases = false }: NotificationsViewProps) {
  const t = useTranslations("notifications");
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();
  const panelId = useId();

  const [tab, setTab] = useState<NotificationTabValue>("for_you");
  const [forYou, setForYou] = useState<TabState>({
    groups: initial.groups,
    cursor: initial.nextCursor,
    loaded: true,
    loading: false,
    error: false,
  });
  const [releases, setReleases] = useState<TabState>(emptyTab());
  const [newReleases, setNewReleases] = useState(initialNewReleases);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState(false);

  const state = tab === "for_you" ? forYou : releases;
  const setState = tab === "for_you" ? setForYou : setReleases;

  useEffect(() => {
    queryClient.setQueryData(NOTIFICATIONS_COUNT_KEY, { count: 0, newReleases });
    void markNotificationsSeen("for_you").catch(() => {
      // Si falla, el contador vuelve a su valor real en el próximo sondeo.
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_COUNT_KEY });
    });
    // Solo al montar: `newReleases` cambia al abrir la pestaña, no debe repetir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  const loadReleases = async () => {
    setReleases((current) => ({ ...current, loading: true, error: false }));
    try {
      const next = await fetchNotificationPage({ timeZone, tab: "releases" });
      setReleases({
        groups: next.groups,
        cursor: next.nextCursor,
        loaded: true,
        loading: false,
        error: false,
      });
    } catch {
      setReleases((current) => ({ ...current, loading: false, error: true }));
    }
  };

  const changeTab = (next: NotificationTabValue) => {
    setTab(next);
    if (next !== "releases") return;
    setNewReleases(false);
    queryClient.setQueryData<{ count: number; newReleases: boolean } | undefined>(
      NOTIFICATIONS_COUNT_KEY,
      (current) => (current ? { ...current, newReleases: false } : current),
    );
    void markNotificationsSeen("releases").catch(() => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_COUNT_KEY });
    });
    if (!releases.loaded && !releases.loading) void loadReleases();
  };

  const markOneRead = (groupId: string) => {
    setState((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId ? { ...group, unread: false } : group,
      ),
    }));
  };

  const removeGroup = (groupId: string) => {
    setState((current) => ({
      ...current,
      groups: current.groups.filter((group) => group.id !== groupId),
    }));
  };

  const loadMore = async () => {
    if (!state.cursor || state.loading) return;
    setState((current) => ({ ...current, loading: true, error: false }));
    try {
      const next = await fetchNotificationPage({ cursor: state.cursor, timeZone, tab });
      setState((current) => ({
        ...current,
        groups: [...current.groups, ...next.groups],
        cursor: next.nextCursor,
        loading: false,
      }));
    } catch {
      setState((current) => ({ ...current, loading: false, error: true }));
    }
  };

  const markAllRead = async () => {
    setMarking(true);
    setMarkError(false);
    try {
      await markNotificationsRead({ all: true }, timeZone);
      // El servidor marca las filas de las dos pestañas: el estado local también.
      const read = (current: TabState) => ({
        ...current,
        groups: current.groups.map((group) => ({ ...group, unread: false })),
      });
      setForYou(read);
      setReleases(read);
      setNewReleases(false);
      queryClient.setQueryData(NOTIFICATIONS_COUNT_KEY, { count: 0, newReleases: false });
    } catch {
      setMarkError(true);
    } finally {
      setMarking(false);
    }
  };

  const hasUnread = state.groups.some((group) => group.unread);

  return (
    <div className="flex flex-col gap-4">
      <NotificationTabs
        active={tab}
        newReleases={newReleases}
        onChange={changeTab}
        label={t("tabs.label")}
        panelId={panelId}
      />

      <div
        id={`${panelId}-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-${tab}`}
        className="flex flex-col gap-4"
      >
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

        {state.loading && state.groups.length === 0 ? (
          <p className="font-body text-sm text-paper-muted">{t("bell.loading")}</p>
        ) : state.error && state.groups.length === 0 ? (
          <p role="alert" className="font-data text-xs text-danger">
            {t("page.error")}
          </p>
        ) : state.groups.length === 0 ? (
          <section className="flex flex-col items-start gap-3 rounded-lg border border-ink-border bg-ink-surface px-5 py-8">
            <h2 className="font-display text-lg text-paper">
              {tab === "releases" ? t("page.emptyReleasesTitle") : t("page.emptyTitle")}
            </h2>
            <p className="max-w-prose font-body text-sm text-paper-muted">
              {tab === "releases"
                ? t("page.emptyReleasesDescription")
                : t("page.emptyDescription")}
            </p>
          </section>
        ) : (
          <ul className="divide-y divide-ink-border rounded-lg border border-ink-border bg-ink-surface">
            {state.groups.map((group) => (
              <NotificationRow
                key={group.id}
                group={group}
                onRead={() => markOneRead(group.id)}
                onResolved={() => removeGroup(group.id)}
              />
            ))}
          </ul>
        )}

        {state.error && state.groups.length > 0 ? (
          <p role="alert" className="font-data text-xs text-danger">
            {t("page.error")}
          </p>
        ) : null}

        {state.cursor ? (
          <button
            type="button"
            disabled={state.loading}
            onClick={() => void loadMore()}
            className="self-center rounded border border-ink-border px-4 py-2 font-display text-sm text-paper-muted transition-colors hover:border-amber hover:text-paper disabled:cursor-wait disabled:opacity-60"
          >
            {state.loading ? t("page.loadingMore") : t("page.loadMore")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
