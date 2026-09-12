"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getListsContainingItem } from "@/lib/api/lists";
import { queryKeys } from "@/lib/query/keys";
import type { DiscoverListsResponse, ListTarget } from "@/lib/api/schemas";
import { CommunityListCard } from "./CommunityListCard";
import { ListsGrid } from "./lists-shared";

const PAGE_SIZE = 20;

interface ItemListsSectionProps {
  target: ListTarget;
  initial: DiscoverListsResponse;
  canSave: boolean;
}

// Grilla paginada de la página dedicada "Mostrar en listas" (openspec:
// show-item-in-lists) — a la que el panel acotado a 4 resultados envía con su
// enlace "Ver más". Mismo patrón que `CommunityListSection` (primera página
// server-rendered + `useInfiniteQuery` + botón "Cargar más"), pero con un
// `target` puntual en vez de una de las tres fuentes fijas de /lists.
export function ItemListsSection({ target, initial, canSave }: ItemListsSectionProps) {
  const t = useTranslations("lists");

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError } = useInfiniteQuery({
    queryKey: queryKeys.listsContainingItem(target),
    queryFn: ({ pageParam }) => getListsContainingItem(target, pageParam, PAGE_SIZE, "popular"),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    initialData: { pages: [initial], pageParams: [1] },
    staleTime: 30_000,
  });

  const lists = data?.pages.flatMap((page) => page.lists) ?? initial.lists;

  if (lists.length === 0) {
    return <EmptyState title={t("containingEmptyTitle")} description={t("containingEmptyDescription")} />;
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <ListsGrid>
        {lists.map((list) => (
          <CommunityListCard key={list.id} list={list} canSave={canSave} />
        ))}
      </ListsGrid>

      {isError ? (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      ) : null}
      {hasNextPage ? (
        <Button
          variant="secondary"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          className="self-center"
        >
          {isFetchingNextPage ? t("loadingMore") : t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
