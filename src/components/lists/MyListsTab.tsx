"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
import type { MyListsResponse } from "@/lib/api/schemas";
import { DeleteListDialog } from "./DeleteListDialog";
import { ListCard } from "./ListCard";
import { ListsGrid, entityTypeKey } from "./lists-shared";
import { ListsToolbar } from "./ListsToolbar";
import { useListsSection } from "./ListsSection";
import { useListFilters, type ListFiltersState } from "./use-list-filters";

const PAGE_SIZE = 20;

// Acción de texto de una tarjeta: 32 px de alto (44 con puntero grueso) para que se pueda tocar sin apuntar
// (openspec: refine-me-lists-page-phase1, D2).
const ACTION =
  "inline-flex min-h-8 items-center rounded px-1 text-paper-muted underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50 [@media(pointer:coarse)]:min-h-11";

export function MyListsTab({
  initial,
  initialFilters,
}: {
  initial: MyListsResponse;
  /** Filtros leídos de la URL (`?q=&type=&sort=`); `initial` ya viene filtrado con ellos. */
  initialFilters?: Partial<ListFiltersState>;
}) {
  const t = useTranslations("lists");
  const queryClient = useQueryClient();

  const { filters, setFilters, searchInput, setSearchInput, isFiltered, params, clear } =
    useListFilters(initialFilters, { syncUrl: true });
  const { reportTotal, openNewList } = useListsSection();
  const [pendingDelete, setPendingDelete] = useState<MyListsResponse["lists"][number] | null>(null);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  // Último fallo de una tarjeta: se muestra bajo ella (D6). Antes un error distinto de "no existe" no decía nada.
  const [failure, setFailure] = useState<{ id: string; kind: "delete" | "pin" } | null>(null);
  const [announce, setAnnounce] = useState("");

  const queryKey = queryKeys.myLists(params);
  // Clave de los filtros con que se abrió la página: `initial` (leído en el servidor) solo vale para ellos.
  const [openedKey] = useState(() => JSON.stringify(params));

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError, isPending } =
    useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam }) => getMyLists(pageParam, PAGE_SIZE, params),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
      // `initial` corresponde a los filtros con que se abrió la página: sirve mientras sigan siendo esos.
      initialData: JSON.stringify(params) === openedKey ? { pages: [initial], pageParams: [1] } : undefined,
      staleTime: 15_000,
      placeholderData: keepPreviousData,
    });

  const lists = data?.pages.flatMap((page) => page.lists) ?? [];
  const counts = data?.pages[0]?.counts ?? initial.counts;

  // El total de la pestaña sigue a las cifras de cada respuesta: crear o borrar una lista lo actualiza (D4).
  useEffect(() => {
    reportTotal("mine", counts.artist + counts["release-group"] + counts.recording);
  }, [counts, reportTotal]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["lists", "mine"], exact: false });

  const handleDelete = async (id: string) => {
    setRowBusyId(id);
    setFailure(null);
    try {
      await deleteList(id);
      await invalidate();
    } catch (err) {
      if (err instanceof ApiError && err.code === "LIST_NOT_FOUND") {
        await invalidate();
      } else {
        setFailure({ id, kind: "delete" });
      }
    } finally {
      setRowBusyId(null);
    }
  };

  const handlePin = async (id: string, pinned: boolean) => {
    setRowBusyId(id);
    setFailure(null);
    try {
      await (pinned ? unpinList(id) : pinList(id));
      await invalidate();
    } catch {
      // la lista sigue en su posición previa; el aviso va bajo su tarjeta
      setFailure({ id, kind: "pin" });
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
      counts={counts}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Sin ninguna lista no hay nada que filtrar: solo el estado vacío con su acción. */}
      {counts.artist + counts["release-group"] + counts.recording > 0 || isFiltered ? toolbar : null}

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>

      {lists.length === 0 && !isPending ? (
        <EmptyState
          title={isFiltered ? t("noResultsTitle") : t("emptyTitle")}
          description={isFiltered ? t("noResultsDescription") : t("emptyDescription")}
          action={
            isFiltered ? undefined : (
              <Button variant="secondary" onClick={openNewList}>
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
      itemCount={list.itemCount}
      entityType={list.entityType}
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
                <div className="flex flex-col gap-1">
                  <div className="-ml-1 flex flex-wrap items-center gap-1 font-data text-xs">
                    <button
                      type="button"
                      disabled={rowBusyId === list.id}
                      onClick={() => void handlePin(list.id, list.pinned)}
                      aria-label={t(list.pinned ? "unpinNamed" : "pinNamed", { title: list.title })}
                      className={ACTION}
                    >
                      {list.pinned ? t("unpin") : t("pin")}
                    </button>
                    <Link
                      href={`/me/lists/${list.id}`}
                      aria-label={t("editNamed", { title: list.title })}
                      className={ACTION}
                    >
                      {t("edit")}
                    </Link>
                    <button
                      type="button"
                      disabled={rowBusyId === list.id}
                      onClick={() => setPendingDelete(list)}
                      aria-label={t("deleteNamed", { title: list.title })}
                      className={`${ACTION} hover:text-danger`}
                    >
                      {rowBusyId === list.id && failure === null ? t("deleting") : t("delete")}
                    </button>
                  </div>
                  {failure?.id === list.id ? (
                    <span role="alert" className="font-data text-xs text-danger">
                      {t(failure.kind === "delete" ? "deleteError" : "pinError")}
                    </span>
                  ) : null}
                </div>
              }
            />
          ))}
        </ListsGrid>
      )}

      <DeleteListDialog
        list={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const id = pendingDelete?.id;
          setPendingDelete(null);
          if (id) void handleDelete(id);
        }}
      />

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
