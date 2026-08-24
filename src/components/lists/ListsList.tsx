"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListForm } from "./ListForm";
import { deleteList, getMyLists, getUserLists } from "@/lib/api/lists";
import { ApiError } from "@/lib/api/client";
import type { ListsListResponse, UserListDetail, UserListSummary } from "@/lib/api/schemas";

interface ListsListProps {
  initial: ListsListResponse;
  readOnly?: boolean;
  username?: string;
  empty?: { title: string; description: string };
}

// Listado de listas con creación (modo propio) y borrado con confirmación.
// En modo lectura (perfil ajeno) solo muestra las visibles.
export function ListsList({ initial, readOnly, username, empty }: ListsListProps) {
  const t = useTranslations("lists");
  const [lists, setLists] = useState<UserListSummary[]>(initial.lists);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [showForm, setShowForm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  if (lists.length === 0 && !showForm) {
    return (
      <EmptyState
        title={empty?.title ?? t("emptyTitle")}
        description={empty?.description ?? t("emptyDescription")}
        action={!readOnly ? <Button variant="secondary" onClick={() => setShowForm(true)}>{t("newList")}</Button> : undefined}
      />
    );
  }

  const handleDelete = async (list: UserListSummary) => {
    setLoading(true);
    setLoadError(false);
    try {
      await deleteList(list.id);
      setLists((current) => current.filter((item) => item.id !== list.id));
      setPendingDeleteId(null);
    } catch (error) {
      if (error instanceof ApiError && error.code === "LIST_NOT_FOUND") {
        setLists((current) => current.filter((item) => item.id !== list.id));
        setPendingDeleteId(null);
      } else {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = readOnly && username
        ? await getUserLists(username, page + 1, 20)
        : await getMyLists(page + 1, 20);
      setLists((current) => [...current, ...next.lists]);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = (list: UserListDetail) => {
    setLists((current) => [list, ...current]);
    setShowForm(false);
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={() => setShowForm((current) => !current)}>
            {showForm ? t("collapse") : t("newList")}
          </Button>
        </div>
      )}
      {showForm && <ListForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />}
      <ul className="flex flex-col gap-4">
        {lists.map((list) => (
          <li key={list.id} className="rounded border border-ink-border bg-ink-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={readOnly && username ? `/users/${encodeURIComponent(username)}/lists/${list.id}` : `/me/lists/${list.id}`}
                  className="font-display text-lg text-paper transition-colors hover:text-amber"
                >
                  {list.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-data text-xs text-paper-muted">
                  <span>{t(`entityType${entityKey(list.entityType)}`)}</span>
                  {!readOnly && <span>{t(`audience.${list.audience}`)}</span>}
                </div>
                {list.description ? <p className="mt-2 whitespace-pre-wrap font-body text-sm text-paper-muted">{list.description}</p> : null}
              </div>
              {!readOnly && (
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {pendingDeleteId === list.id ? (
                    <div className="flex items-center gap-2">
                      <span className="font-data text-xs text-danger">{t("deleteConfirm")}</span>
                      <Button variant="primary" disabled={loading} onClick={() => void handleDelete(list)}>
                        {loading ? t("deleting") : t("delete")}
                      </Button>
                      <Button variant="ghost" disabled={loading} onClick={() => setPendingDeleteId(null)}>
                        {t("collapse")}
                      </Button>
                    </div>
                  ) : (
                    <Button variant="ghost" onClick={() => setPendingDeleteId(list.id)}>
                      {t("delete")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {hasNext && (
        <Button variant="secondary" disabled={loading} onClick={() => void handleLoadMore()} className="self-center">
          {loading ? t("loadingMore") : t("loadMore")}
        </Button>
      )}
      {loadError && (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      )}
    </div>
  );
}

function entityKey(entityType: string): string {
  if (entityType === "artist") return "Artist";
  if (entityType === "release-group") return "Album";
  return "Song";
}