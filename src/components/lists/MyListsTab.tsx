"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
import { Dialog } from "@/components/ui/Dialog";
import { DeleteListDialog } from "./DeleteListDialog";
import { ListMetaForm } from "./ListMetaForm";
import { MyListCardMenu } from "./MyListCardMenu";
import { ListCard } from "./ListCard";
import { ListsGrid, entityTypeKey } from "./lists-shared";
import { ListsToolbar } from "./ListsToolbar";
import { useListsSection } from "./ListsSection";
import { useListFilters, type ListFiltersState } from "./use-list-filters";

const PAGE_SIZE = 20;

const SECTION_LABEL = "font-data text-xs uppercase tracking-wider text-paper-muted";

// Lo que se puede agregar a una lista vacía, según su tipo (openspec: redesign-me-lists-views, D5).
const EMPTY_HINT = {
  "release-group": "emptyHintAlbum",
  artist: "emptyHintArtist",
  recording: "emptyHintSong",
} as const;

export function MyListsTab({
  initial,
  initialFilters,
  ownerUsername,
}: {
  initial: MyListsResponse;
  /** Usuario del dueño, para "Ver como la ven otros". */
  ownerUsername: string;
  /** Filtros leídos de la URL (`?q=&type=&sort=`); `initial` ya viene filtrado con ellos. */
  initialFilters?: Partial<ListFiltersState>;
}) {
  const t = useTranslations("lists");
  const queryClient = useQueryClient();

  const { filters, setFilters, searchInput, setSearchInput, isFiltered, params, clear } =
    useListFilters(initialFilters, { syncUrl: true });
  const { reportTotal, openNewList } = useListsSection();
  const [editing, setEditing] = useState<MyListsResponse["lists"][number] | null>(null);
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

  // Fijadas arriba, como sección y no como marca (D2): la API ya las devuelve primero.
  const pinned = lists.filter((list) => list.pinned);
  const rest = lists.filter((list) => !list.pinned);

  const card = (list: MyListsResponse["lists"][number]) => (
    <ListCard
      key={list.id}
      layout="shelf"
      href={`/me/lists/${list.id}`}
      title={list.title}
      coverThumbs={list.coverThumbs}
      itemCount={list.itemCount}
      entityType={list.entityType}
      emptyHint={t(EMPTY_HINT[list.entityType])}
      meta={
        <>
          <span>{t(entityTypeKey(list.entityType))}</span>
          <span aria-hidden>·</span>
          <span>{t("itemsCount", { count: list.itemCount })}</span>
          <span aria-hidden>·</span>
          <span>{t(`audience.${list.audience}`)}</span>
        </>
      }
      subMeta={
        rowBusyId === list.id && failure === null ? (
          <span>{t("saving")}</span>
        ) : failure?.id === list.id ? (
          <span role="alert" className="text-danger">
            {t(failure.kind === "delete" ? "deleteError" : "pinError")}
          </span>
        ) : undefined
      }
      action={
        <MyListCardMenu
          list={list}
          ownerUsername={ownerUsername}
          onTogglePin={() => void handlePin(list.id, list.pinned)}
          onEdit={() => setEditing(list)}
          onDelete={() => setPendingDelete(list)}
        />
      }
    />
  );

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
        <div className="flex flex-col gap-6">
          {pinned.length > 0 ? (
            <section aria-labelledby="my-lists-pinned" className="flex flex-col gap-3">
              <h2 id="my-lists-pinned" className={SECTION_LABEL}>
                {t("pinnedSection")}
              </h2>
              <ListsGrid cols="shelf">{pinned.map(card)}</ListsGrid>
            </section>
          ) : null}
          {rest.length > 0 ? (
            <section aria-labelledby={pinned.length > 0 ? "my-lists-all" : undefined} className="flex flex-col gap-3">
              {pinned.length > 0 ? (
                <h2 id="my-lists-all" className={SECTION_LABEL}>
                  {t("allSection")}
                </h2>
              ) : null}
              <ListsGrid cols="shelf">{rest.map(card)}</ListsGrid>
            </section>
          ) : null}
        </div>
      )}

      <Dialog open={editing !== null} title={t("editDetailsTitle")} onClose={() => setEditing(null)}>
        {editing ? (
          <ListMetaForm
            bare
            list={editing}
            onSaved={() => {
              setEditing(null);
              void invalidate();
            }}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Dialog>

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
