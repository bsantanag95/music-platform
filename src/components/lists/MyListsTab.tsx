"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  deleteList,
  getMyLists,
  pinList,
  unpinList,
} from "@/lib/api/lists";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { ListsListResponse } from "@/lib/api/schemas";
import { ListForm } from "./ListForm";
import { ListCard } from "./ListCard";
import { ListsGrid, entityTypeKey } from "./lists-shared";
import { ListsToolbar } from "./ListsToolbar";
import { useListFilters } from "./use-list-filters";

const PAGE_SIZE = 20;

export function MyListsTab({ initial }: { initial: ListsListResponse }) {
  const t = useTranslations("lists");
  const queryClient = useQueryClient();

  const { filters, setFilters, searchInput, setSearchInput, isFiltered, params, clear } =
    useListFilters();
  const [showForm, setShowForm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");

  const queryKey = queryKeys.myLists(params);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError, isPending } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) => getMyLists(pageParam, PAGE_SIZE, params),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
      initialData: isFiltered ? undefined : { pages: [initial], pageParams: [1] },
      staleTime: 15_000,
      placeholderData: keepPreviousData,
    });

  const lists = data?.pages.flatMap((page) => page.lists) ?? (isFiltered ? [] : initial.lists);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["lists", "mine"], exact: false });

  const handleDelete = async (id: string) => {
    setRowBusyId(id);
    try {
      await deleteList(id);
      setPendingDeleteId(null);
      await invalidate();
    } catch (err) {
      if (err instanceof ApiError && err.code === "LIST_NOT_FOUND") {
        setPendingDeleteId(null);
        await invalidate();
      }
    } finally {
      setRowBusyId(null);
    }
  };

  const handlePin = async (id: string, pinned: boolean) => {
    setRowBusyId(id);
    try {
      await (pinned ? unpinList(id) : pinList(id));
      await invalidate();
    } catch {
      // sin cambio de estado local: la lista se re-renderiza en su posición previa
    } finally {
      setRowBusyId(null);
    }
  };

  const toolbar = (
    <ListsToolbar
      filters={filters}
      onChange={setFilters}
      searchInput={searchInput}
      onSearchInput={setSearchInput}
      isFiltered={isFiltered}
      onClear={clear}
      searchPlaceholder={t("searchPlaceholder")}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? t("collapse") : t("newList")}
        </Button>
      </div>

      {showForm ? (
        <ListForm
          onCreated={() => {
            setShowForm(false);
            void invalidate();
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      {toolbar}

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>

      {lists.length === 0 && !isPending ? (
        <EmptyState
          title={isFiltered ? t("noResultsTitle") : t("emptyTitle")}
          description={isFiltered ? t("noResultsDescription") : t("emptyDescription")}
          action={
            isFiltered ? undefined : (
              <Button variant="secondary" onClick={() => setShowForm(true)}>
                {t("newList")}
              </Button>
            )
          }
        />
      ) : (
        <ListsGrid>
          {lists.map((list) => (
            <ListCard
              key={list.id}
              href={`/me/lists/${list.id}`}
              title={list.title}
              coverThumbs={list.coverThumbs}
              description={list.description}
              pinned={list.pinned}
              pinnedLabel={t("pinnedBadge")}
              meta={
                <>
                  <span>{t(entityTypeKey(list.entityType))}</span>
                  <span aria-hidden>·</span>
                  <span>{t("itemsCount", { count: list.itemCount })}</span>
                  <span aria-hidden>·</span>
                  <span>{t(`audience.${list.audience}`)}</span>
                </>
              }
              action={
                <div className="flex items-center gap-2 font-data text-xs">
                  {pendingDeleteId === list.id ? (
                    <>
                      <span className="text-danger">{t("deleteShort")}</span>
                      <button
                        type="button"
                        disabled={rowBusyId === list.id}
                        onClick={() => void handleDelete(list.id)}
                        className="text-danger underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50"
                      >
                        {rowBusyId === list.id ? t("deleting") : t("delete")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="text-paper-muted transition-colors hover:text-paper"
                      >
                        {t("collapse")}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={rowBusyId === list.id}
                        onClick={() => void handlePin(list.id, list.pinned)}
                        className="text-paper-muted underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50"
                      >
                        {list.pinned ? t("unpin") : t("pin")}
                      </button>
                      <Link
                        href={`/me/lists/${list.id}`}
                        className="text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
                      >
                        {t("edit")}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(list.id)}
                        className="text-paper-muted underline decoration-dotted transition-colors hover:text-danger"
                      >
                        {t("delete")}
                      </button>
                    </>
                  )}
                </div>
              }
            />
          ))}
        </ListsGrid>
      )}

      {isError ? (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      ) : null}
      {hasNextPage ? (
        <Button
          variant="secondary"
          disabled={isFetchingNextPage}
          onClick={() => {
            const before = lists.length;
            void fetchNextPage().then((res) => {
              const after = res.data?.pages.flatMap((p) => p.lists).length ?? before;
              if (after > before) setAnnounce(t("loadedAnnouncement", { count: after - before }));
            });
          }}
          className="self-center"
        >
          {isFetchingNextPage ? t("loadingMore") : t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
