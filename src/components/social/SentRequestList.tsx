"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch } from "@/lib/api/client";
import { SentRequestsPageResponseSchema, type SentRequestsPageResponse } from "@/lib/api/schemas";
import { Button } from "@/components/ui/Button";
import { UndoToast } from "@/components/ui/UndoToast";
import { UserAvatar } from "./UserAvatar";
import { useDeferredRemoval } from "./use-deferred-removal";

type SentRow = SentRequestsPageResponse["users"][number];

interface SentRequestListProps {
  initial: SentRequestsPageResponse;
  empty: ReactNode;
}

function sendCancel(user: SentRow, keepalive: boolean): Promise<unknown> {
  return fetch(`/api/users/${encodeURIComponent(user.username)}/follow`, { method: "DELETE", keepalive }).then(
    (response) => {
      // Si la otra persona ya respondió o la cuenta ya no está, no queda nada que cancelar.
      if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}`);
      return response;
    },
  );
}

// Solicitudes enviadas y pendientes (openspec: add-follow-requests-sent-and-bulk, D2): de la más reciente a la más
// antigua, con "Mostrar más" por cursor. Cancelar quita la fila y ofrece Deshacer; la cancelación se envía al vencer el
// aviso, con otra cancelación o al salir, así que deshacer no vuelve a notificar a la otra persona.
export function SentRequestList({ initial, empty }: SentRequestListProps) {
  const t = useTranslations("users.requests");
  const tUsers = useTranslations("users");
  const format = useFormatter();
  const now = useNow();
  const [items, setItems] = useState<SentRow[]>(initial.users);
  const [total, setTotal] = useState(initial.total);
  const [fetched, setFetched] = useState(initial.users.length);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const changeTotal = useCallback((delta: number) => setTotal((count) => Math.max(0, count + delta)), []);
  const { pending, remove, undo, expire, dismiss } = useDeferredRemoval<SentRow>({
    items,
    setItems,
    send: sendCancel,
    onCountChange: changeTotal,
  });

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const page = await apiFetch(
        `/api/me/follow-requests/sent?cursor=${encodeURIComponent(cursor)}`,
        SentRequestsPageResponseSchema,
      );
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.users.filter((user) => !seen.has(user.id))];
      });
      setFetched((count) => count + page.users.length);
      setCursor(page.nextCursor);
      setHasNext(page.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const remaining = Math.max(0, initial.total - fetched);

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 ? (
        <p className="font-data text-xs text-paper-muted" role="status">
          {t("sentCount", { count: total })}
        </p>
      ) : null}
      {items.length === 0 ? (
        empty
      ) : (
        <ul className="flex flex-col border-t border-ink-border">
          {items.map((user) => {
            const name = user.displayName ?? user.username;
            return (
              <li
                key={user.id}
                className="group flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-border py-3"
              >
                <Link
                  href={`/users/${encodeURIComponent(user.username)}`}
                  className="flex min-w-0 flex-1 basis-48 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <UserAvatar avatarUrl={user.avatarUrl} username={user.username} name={name} size="sm" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-base text-paper transition-colors group-hover:text-amber">
                      {name}
                    </span>
                    <span className="font-data text-xs text-paper-muted [overflow-wrap:anywhere]">
                      @{user.username} · {t("sentAgo", { when: format.relativeTime(new Date(user.requestedAt), now) })}
                    </span>
                  </span>
                </Link>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <Button variant="secondary" onClick={() => remove(user)}>
                    {tUsers("cancelRequest")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {hasNext ? (
        <div className="flex flex-col items-center gap-1">
          <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore
              ? tUsers("connections.loadingMore")
              : remaining > 0
                ? tUsers("connections.showMoreCount", { count: remaining })
                : tUsers("connections.showMore")}
          </Button>
          {loadError ? (
            <p role="alert" className="font-data text-xs text-danger">
              {tUsers("connections.loadMoreError")}
            </p>
          ) : null}
        </div>
      ) : null}
      {pending ? (
        <UndoToast
          key={`${pending.item.id}-${pending.failed}`}
          message={
            pending.failed
              ? t("cancelError", { name: pending.item.displayName ?? pending.item.username })
              : t("cancelled", { name: pending.item.displayName ?? pending.item.username })
          }
          undoLabel={tUsers("connections.undo")}
          onUndo={pending.failed ? undefined : undo}
          onExpire={pending.failed ? dismiss : expire}
        />
      ) : null}
    </div>
  );
}
