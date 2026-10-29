"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import {
  FollowRequestsPageResponseSchema,
  NoContentSchema,
  type FollowRequestItem,
  type FollowRequestsPageResponse,
} from "@/lib/api/schemas";
import { Button } from "@/components/ui/Button";
import { UndoToast } from "@/components/ui/UndoToast";
import { FollowButton } from "./FollowButton";
import { UserAvatar } from "./UserAvatar";

interface FollowRequestListProps {
  initial: FollowRequestsPageResponse;
  /** Lo que se muestra sin solicitudes (depende de la privacidad del perfil, D4). */
  empty: ReactNode;
}

type Row = FollowRequestItem & { approved?: boolean };

// Rechazo a la espera de que venza el aviso (openspec: refine-follow-requests-phase1, D2).
interface PendingReject {
  user: Row;
  index: number;
  failed: boolean;
}

function sendReject(user: Row, keepalive = false): Promise<unknown> {
  return fetch(`/api/me/follow-requests/${encodeURIComponent(user.id)}/reject`, { method: "POST", keepalive }).then(
    (response) => {
      // Si la otra persona ya la canceló, no hay nada que rechazar: cuenta como hecho.
      if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}`);
      return response;
    },
  );
}

// Bandeja de solicitudes recibidas (openspec: refine-follow-requests-phase1): de la más reciente a la más antigua, con
// "Mostrar más" por cursor. Rechazar quita la fila y ofrece Deshacer; el rechazo se envía al vencer el aviso, con otro
// rechazo o al salir de la vista. Aprobar deja la fila con "ahora te sigue" y, si no la sigues, "Seguir de vuelta".
export function FollowRequestList({ initial, empty }: FollowRequestListProps) {
  const t = useTranslations("users.requests");
  const tUsers = useTranslations("users");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const now = useNow();
  const [items, setItems] = useState<Row[]>(initial.users);
  const [total, setTotal] = useState(initial.total);
  const [fetched, setFetched] = useState(initial.users.length);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejected, setRejected] = useState<PendingReject | null>(null);

  // El rechazo pendiente vive también en un ref: lo envían el desmontaje y `pagehide`.
  const rejectRef = useRef<PendingReject | null>(null);
  useEffect(() => {
    const flush = () => {
      const pending = rejectRef.current;
      rejectRef.current = null;
      if (pending) void sendReject(pending.user, true).catch(() => undefined);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const restore = useCallback((pending: PendingReject) => {
    setItems((current) => {
      if (current.some((item) => item.id === pending.user.id)) return current;
      const next = [...current];
      next.splice(Math.min(pending.index, next.length), 0, pending.user);
      return next;
    });
    setTotal((count) => count + 1);
  }, []);

  const commit = useCallback(
    (pending: PendingReject) => {
      if (rejectRef.current?.user.id === pending.user.id) rejectRef.current = null;
      sendReject(pending.user).catch(() => {
        restore(pending);
        setRejected({ ...pending, failed: true });
      });
    },
    [restore],
  );

  function reject(user: Row) {
    const previous = rejectRef.current;
    if (previous) commit(previous);
    setNotice(null);
    const index = items.findIndex((item) => item.id === user.id);
    setItems((current) => current.filter((item) => item.id !== user.id));
    setTotal((count) => Math.max(0, count - 1));
    const next = { user, index, failed: false };
    rejectRef.current = next;
    setRejected(next);
  }

  function undo() {
    if (!rejected) return;
    rejectRef.current = null;
    restore(rejected);
    setRejected(null);
  }

  const expire = useCallback(() => {
    const pending = rejectRef.current;
    if (pending) commit(pending);
    setRejected(null);
  }, [commit]);

  async function approve(user: Row) {
    setBusyId(user.id);
    setNotice(null);
    try {
      await apiFetch(`/api/me/follow-requests/${encodeURIComponent(user.id)}/approve`, NoContentSchema, {
        method: "POST",
      });
      setItems((current) => current.map((item) => (item.id === user.id ? { ...item, approved: true } : item)));
      setTotal((count) => Math.max(0, count - 1));
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
      if (code === "REQUEST_NOT_FOUND") {
        // La otra persona la canceló mientras tanto (D3).
        setItems((current) => current.filter((item) => item.id !== user.id));
        setTotal((count) => Math.max(0, count - 1));
        setNotice(t("gone", { name: user.displayName ?? user.username }));
      } else {
        setNotice(tErrors(`${code}.description`));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const page = await apiFetch(
        `/api/me/follow-requests?cursor=${encodeURIComponent(cursor)}`,
        FollowRequestsPageResponseSchema,
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
  const pendingCount = items.filter((item) => !item.approved).length;

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 ? (
        <p className="font-data text-xs text-paper-muted" role="status">
          {t("pendingCount", { count: total })}
        </p>
      ) : null}
      {items.length === 0 ? (
        empty
      ) : (
        <ul className="flex flex-col border-t border-ink-border">
          {items.map((user) => {
            const name = user.displayName ?? user.username;
            const busy = busyId === user.id;
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
                      @{user.username} · {format.relativeTime(new Date(user.requestedAt), now)}
                    </span>
                  </span>
                </Link>
                <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {user.approved ? (
                    <>
                      <span className="font-data text-xs text-paper-muted">{t("approved")}</span>
                      {user.youFollow === "accepted" ? (
                        <span className="font-data text-xs text-paper-muted">{t("alreadyFollowing")}</span>
                      ) : user.youFollow === "pending" ? (
                        <span className="font-data text-xs text-paper-muted">{t("alreadyRequested")}</span>
                      ) : (
                        <FollowButton
                          username={user.username}
                          relation="none"
                          authenticated
                          requestApproval={user.profileVisibility === "private"}
                          followLabel={tUsers("connections.followBack")}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <Button variant="primary" disabled={busy} onClick={() => void approve(user)}>
                        {tUsers("approve")}
                      </Button>
                      <Button variant="secondary" disabled={busy} onClick={() => reject(user)}>
                        {tUsers("reject")}
                      </Button>
                    </>
                  )}
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
      {notice ? (
        <p role="alert" className="font-data text-xs text-danger">
          {notice}
        </p>
      ) : null}
      {pendingCount === 0 && items.length > 0 ? (
        <p className="font-data text-xs text-paper-muted">{t("allDone")}</p>
      ) : null}
      {rejected ? (
        <UndoToast
          key={`${rejected.user.id}-${rejected.failed}`}
          message={
            rejected.failed
              ? t("rejectError", { name: rejected.user.displayName ?? rejected.user.username })
              : t("rejected", { name: rejected.user.displayName ?? rejected.user.username })
          }
          undoLabel={tUsers("connections.undo")}
          onUndo={rejected.failed ? undefined : undo}
          onExpire={rejected.failed ? () => setRejected(null) : expire}
        />
      ) : null}
    </div>
  );
}
