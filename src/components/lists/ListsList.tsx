"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getUserLists } from "@/lib/api/lists";
import type { UserListsResponse } from "@/lib/api/schemas";
import { ProfileListCard } from "./ProfileListCard";
import { ListsGrid } from "./lists-shared";
import { ListsToolbar } from "./ListsToolbar";
import { useListFilters } from "./use-list-filters";

const PAGE_SIZE = 20;

interface ListsListProps {
  initial: UserListsResponse;
  /** Perfil ajeno cuyo `username` posee estas listas (siempre modo lectura). */
  username: string;
  empty?: { title: string; description: string };
}

// Todas las listas visibles de un perfil (`/users/[username]/lists`), de solo
// lectura: conteo, buscador + tipo + orden (mismos que `/me/lists`, sin la
// gestión), grilla de tarjetas con mosaico y la acción Guardar/Seguir. El
// estante del Nivel 2 del perfil solo muestra las primeras en un riel
// (`ListsCarousel`) y enlaza acá. La gestión de listas propias vive en
// /me/lists (`MyListsTab`).
export function ListsList({ initial, username, empty }: ListsListProps) {
  const t = useTranslations("lists");
  const { filters, setFilters, searchInput, setSearchInput, isFiltered, params, clear } =
    useListFilters();
  const [announce, setAnnounce] = useState("");

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError, isPending } =
    useInfiniteQuery({
      queryKey: ["lists", "user", username, params] as const,
      queryFn: ({ pageParam }) => getUserLists(username, pageParam, PAGE_SIZE, params),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
      initialData: isFiltered ? undefined : { pages: [initial], pageParams: [1] },
      staleTime: 15_000,
      placeholderData: keepPreviousData,
    });

  const lists = data?.pages.flatMap((page) => page.lists) ?? (isFiltered ? [] : initial.lists);
  const totalCount = data?.pages[0]?.totalCount ?? (isFiltered ? 0 : initial.totalCount);

  // Sin listas visibles y sin filtros no hay nada que buscar: solo el vacío.
  if (initial.lists.length === 0 && !isFiltered) {
    return (
      <EmptyState
        title={empty?.title ?? t("profileEmptyTitle")}
        description={empty?.description ?? t("profileEmptyDescription")}
      />
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <p className="font-data text-xs text-paper-muted">{t("profileCount", { count: totalCount })}</p>

      <ListsToolbar
        filters={filters}
        onChange={setFilters}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        isFiltered={isFiltered}
        onClear={clear}
        searchPlaceholder={t("profileSearchPlaceholder")}
      />

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>

      {lists.length === 0 && !isPending ? (
        <EmptyState title={t("noResultsTitle")} description={t("profileNoResultsDescription")} />
      ) : (
        <ListsGrid>
          {lists.map((list) => (
            <ProfileListCard key={list.id} list={list} username={username} />
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
