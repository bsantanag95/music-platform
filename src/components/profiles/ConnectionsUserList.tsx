"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ConnectionsPageResponseSchema, FollowResponseSchema, type FollowRelation } from "@/lib/api/schemas";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UndoToast } from "@/components/ui/UndoToast";
import { useProgressFilters } from "@/components/progress/use-progress-filters";
import type {
  ConnectionSegment,
  ConnectionSegmentCounts,
  ConnectionSort,
} from "@/services/social/connection-filters";
import { ConnectionRow, type ConnectionUser } from "./ConnectionRow";
import { ConnectionsToolbar } from "./ConnectionsToolbar";

const SEARCH_DEBOUNCE_MS = 250;

interface ConnectionsPaging {
  username: string;
  kind: "followers" | "following";
  /** Personas del corte (búsqueda + segmento): "Mostrar más" dice cuántas faltan. */
  total: number;
  hasNext: boolean;
  nextCursor: string | null;
}

type ConnectionFilterValues = { q: string; sort: ConnectionSort; segment: ConnectionSegment };

interface ConnectionsFilters {
  initial: ConnectionFilterValues;
  defaultSort: ConnectionSort;
  /** Solo en las vistas propias. */
  segmentCounts?: ConnectionSegmentCounts;
}

interface ConnectionsUserListProps {
  users: ConnectionUser[];
  authenticated: boolean;
  /** Lo que se muestra sin nadie en la lista (texto o `EmptyState`). */
  empty: ReactNode;
  /** El visitante es el dueño de esta lista de seguidores: el menú de cada fila suma "Eliminar seguidor…". */
  ownRemovableFollowers?: boolean;
  /** El visitante es el dueño de esta lista de seguidos: dejar de seguir quita la fila. */
  ownFollowing?: boolean;
  /** "Mostrar más" por cursor; sin `paging` (Seguidos en común) la lista es la que llega. */
  paging?: ConnectionsPaging;
  /** Búsqueda, orden y segmentos (redesign-connections-toolbar); exige `paging`. */
  filters?: ConnectionsFilters;
}

// Acción que quita algo y espera a que venza el aviso para enviarse (openspec: refine-connections-page-phase1, D4).
interface Deferred {
  user: ConnectionUser;
  action: "unfollow" | "remove";
  /** La fila salió de la lista (y en qué lugar estaba) o solo cambió su relación. */
  index: number | null;
  failed: boolean;
}

function commitRequest(deferred: Deferred, keepalive = false): Promise<unknown> {
  const init: RequestInit = { method: "DELETE", keepalive };
  if (deferred.action === "remove") return fetch(`/api/me/followers/${deferred.user.id}`, init).then(assertOk);
  return fetch(`/api/users/${encodeURIComponent(deferred.user.username)}/follow`, init).then(assertOk);
}

function assertOk(response: Response) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

// Listado de Seguidos / Seguidores / Seguidos en común de un perfil: sirve para ver la red de otra persona y, cuando el
// visitante es el dueño, para gestionar la propia. Quitar un seguidor (con confirmación) o dejar de seguir quitan la
// fila y ofrecen Deshacer; la petición sale al vencer el aviso, con otra acción igual o al salir de la vista.
export function ConnectionsUserList({
  users,
  authenticated,
  empty,
  ownRemovableFollowers = false,
  ownFollowing = false,
  paging,
  filters,
}: ConnectionsUserListProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [items, setItems] = useState(users);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [deferred, setDeferred] = useState<Deferred | null>(null);
  const [confirming, setConfirming] = useState<ConnectionUser | null>(null);
  const [hasNext, setHasNext] = useState(paging?.hasNext ?? false);
  const [fetched, setFetched] = useState(users.length);
  const [total, setTotal] = useState(paging?.total ?? 0);
  const [cursor, setCursor] = useState(paging?.nextCursor ?? null);
  const [values, setFilter] = useProgressFilters<ConnectionFilterValues>(
    { q: "", sort: filters?.defaultSort ?? "recent", segment: "all" },
    filters?.initial,
  );
  const [searchInput, setSearchInput] = useState(values.q);
  const [reloading, setReloading] = useState(false);
  const requestRef = useRef(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // El pendiente vive también en un ref: lo envía el desmontaje y `pagehide`, que no ven el estado del render.
  const deferredRef = useRef<Deferred | null>(null);
  useEffect(() => {
    deferredRef.current = deferred && !deferred.failed ? deferred : null;
  }, [deferred]);
  useEffect(() => {
    const flush = () => {
      const pending = deferredRef.current;
      deferredRef.current = null;
      if (pending) void commitRequest(pending, true).catch(() => undefined);
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const restore = useCallback((pending: Deferred) => {
    setItems((current) => {
      if (pending.index === null) {
        return current.map((item) => (item.id === pending.user.id ? { ...item, relation: pending.user.relation } : item));
      }
      if (current.some((item) => item.id === pending.user.id)) return current;
      const next = [...current];
      next.splice(Math.min(pending.index, next.length), 0, pending.user);
      return next;
    });
  }, []);

  const commit = useCallback(
    (pending: Deferred) => {
      if (deferredRef.current?.user.id === pending.user.id) deferredRef.current = null;
      commitRequest(pending).catch(() => {
        restore(pending);
        setDeferred({ ...pending, failed: true });
      });
    },
    [restore],
  );

  function startDeferred(user: ConnectionUser, action: Deferred["action"]) {
    const previous = deferredRef.current;
    if (previous) commit(previous);
    setErrorCode(null);
    const removesRow = action === "remove" || ownFollowing;
    const index = removesRow ? items.findIndex((item) => item.id === user.id) : null;
    setItems((current) =>
      removesRow
        ? current.filter((item) => item.id !== user.id)
        : current.map((item) => (item.id === user.id ? { ...item, relation: "none" } : item)),
    );
    const next: Deferred = { user, action, index, failed: false };
    deferredRef.current = next;
    setDeferred(next);
  }

  function undo() {
    if (!deferred) return;
    deferredRef.current = null;
    restore(deferred);
    setDeferred(null);
  }

  const expire = useCallback(() => {
    const pending = deferredRef.current;
    if (pending) commit(pending);
    setDeferred(null);
  }, [commit]);

  function changeRelation(user: ConnectionUser, relation: FollowRelation) {
    setItems((current) => current.map((item) => (item.id === user.id ? { ...item, relation } : item)));
  }

  async function cancelRequest(user: ConnectionUser) {
    setBusyId(user.id);
    setErrorCode(null);
    try {
      await apiFetch(`/api/users/${encodeURIComponent(user.username)}/follow`, FollowResponseSchema, {
        method: "DELETE",
      });
      changeRelation(user, "none");
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusyId(null);
    }
  }

  function pageUrl(nextCursor: string | null) {
    if (!paging) return "";
    const params = new URLSearchParams();
    if (filters) {
      if (values.q.trim()) params.set("q", values.q.trim());
      params.set("sort", values.sort);
      if (values.segment !== "all") params.set("segment", values.segment);
    }
    if (nextCursor) params.set("cursor", nextCursor);
    const query = params.toString();
    return `/api/users/${encodeURIComponent(paging.username)}/connections/${paging.kind}${query ? `?${query}` : ""}`;
  }

  async function loadMore() {
    if (!paging || !cursor) return;
    const request = requestRef.current;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const page = await apiFetch(pageUrl(cursor), ConnectionsPageResponseSchema);
      if (request !== requestRef.current) return;
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

  // La búsqueda espera a que se deje de escribir; orden y segmento recargan al instante (D6).
  useEffect(() => {
    if (searchInput === values.q) return;
    const id = window.setTimeout(() => setFilter("q", searchInput), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput, values.q, setFilter]);

  // Un filtro nuevo pide la primera página y reemplaza la lista; un Deshacer pendiente se envía antes, y una respuesta
  // de un filtro anterior se descarta.
  const filterKey = `${values.q}\u0000${values.sort}\u0000${values.segment}`;
  const loadedKey = useRef(filterKey);
  useEffect(() => {
    if (loadedKey.current === filterKey) return;
    loadedKey.current = filterKey;
    if (!filters || !paging) return;
    const pending = deferredRef.current;
    if (pending) {
      commit(pending);
      setDeferred(null);
    }
    const request = ++requestRef.current;
    setReloading(true);
    setLoadError(false);
    apiFetch(pageUrl(null), ConnectionsPageResponseSchema)
      .then((page) => {
        if (request !== requestRef.current) return;
        setItems(page.users);
        setFetched(page.users.length);
        setTotal(page.total);
        setCursor(page.nextCursor);
        setHasNext(page.hasNext);
      })
      .catch(() => {
        if (request === requestRef.current) setLoadError(true);
      })
      .finally(() => {
        if (request === requestRef.current) setReloading(false);
      });
    // Solo el cambio de filtros dispara la recarga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const toast = deferred ? (
    <UndoToast
      key={`${deferred.user.id}-${deferred.failed}`}
      message={
        deferred.failed
          ? t(`connections.${deferred.action}Error`, { name: deferred.user.displayName ?? deferred.user.username })
          : t(`connections.${deferred.action}Done`, { name: deferred.user.displayName ?? deferred.user.username })
      }
      undoLabel={t("connections.undo")}
      onUndo={deferred.failed ? undefined : undo}
      onExpire={deferred.failed ? () => setDeferred(null) : expire}
    />
  ) : null;

  const dialog = (
    <ConfirmDialog
      open={confirming !== null}
      title={t("connections.removeConfirmTitle", { name: confirming?.displayName ?? confirming?.username ?? "" })}
      message={t("connections.removeConfirmMessage")}
      confirmLabel={t("connections.removeConfirm")}
      cancelLabel={t("connections.removeCancel")}
      danger
      onConfirm={() => {
        if (confirming) startDeferred(confirming, "remove");
        setConfirming(null);
      }}
      onCancel={() => setConfirming(null)}
    />
  );

  const remaining = paging ? Math.max(0, total - fetched) : 0;
  const filtered = Boolean(filters) && (values.q.trim() !== "" || values.segment !== "all");
  const context = ownRemovableFollowers ? "ownFollowers" : ownFollowing ? "ownFollowing" : "other";

  return (
    <div className="flex flex-col gap-3">
      {filters ? (
        <ConnectionsToolbar
          kind={paging?.kind ?? "followers"}
          searchInput={searchInput}
          onSearchInput={setSearchInput}
          sort={values.sort}
          onSortChange={(sort) => setFilter("sort", sort)}
          segment={values.segment}
          onSegmentChange={(segment) => setFilter("segment", segment)}
          segmentCounts={filters.segmentCounts}
        />
      ) : null}
      {items.length === 0 ? (
        filtered ? (
          <p className="font-body text-sm text-paper-muted">
            {values.q.trim() ? t("connections.noMatch", { q: values.q.trim() }) : t("connections.noMatchSegment")}
          </p>
        ) : (
          empty
        )
      ) : (
        <ul
          aria-busy={reloading}
          className={`flex flex-col border-t border-ink-border transition-opacity ${reloading ? "opacity-60" : ""}`}
        >
          {items.map((user) => (
            <ConnectionRow
              key={user.id}
              user={user}
              authenticated={authenticated}
              removable={ownRemovableFollowers}
              context={context}
              busy={busyId === user.id}
              pendingUnfollow={deferred !== null && !deferred.failed && deferred.user.id === user.id}
              onUndoPending={undo}
              onRelationChange={changeRelation}
              onUnfollow={(target) => startDeferred(target, "unfollow")}
              onCancelRequest={(target) => void cancelRequest(target)}
              onRemove={setConfirming}
            />
          ))}
        </ul>
      )}
      {hasNext ? (
        <div className="flex flex-col items-center gap-1">
          <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore
              ? t("connections.loadingMore")
              : remaining > 0
                ? t("connections.showMoreCount", { count: remaining })
                : t("connections.showMore")}
          </Button>
          {loadError ? (
            <p role="alert" className="font-data text-xs text-danger">
              {t("connections.loadMoreError")}
            </p>
          ) : null}
        </div>
      ) : null}
      {errorCode && (
        <p role="alert" className="font-data text-xs text-danger">
          {tErrors(`${errorCode}.description`)}
        </p>
      )}
      {toast}
      {dialog}
    </div>
  );
}

export function ConnectionsSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-paper">{heading}</h2>
      {children}
    </section>
  );
}
