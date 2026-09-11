"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getDiscoverLists, type DiscoverListFiltersParams } from "@/lib/api/lists";
import { queryKeys } from "@/lib/query/keys";
import type { DiscoverListsResponse } from "@/lib/api/schemas";
import { CommunityListCard } from "./CommunityListCard";
import { ListsGrid } from "./lists-shared";
import { toDiscoverFilters, type CommunityListFilters } from "./community-filters";

const PAGE_SIZE = 20;

interface CommunityExploreGridProps {
  /** Primera página resuelta en el servidor para los filtros actuales. */
  initial: DiscoverListsResponse;
  filters: CommunityListFilters;
  canSave: boolean;
}

// Modo explorar de `/lists` (cambio rework-public-lists-surface): una única
// grilla paginada con los filtros y el orden aplicados en el servidor. La
// primera página llega del Server Component; el resto se pide por
// `useInfiniteQuery`. Los filtros forman parte de la query key, así que cambiar
// cualquier filtro reinicia la serie desde la página 1.
export function CommunityExploreGrid({ initial, filters, canSave }: CommunityExploreGridProps) {
  const t = useTranslations("lists");
  const router = useRouter();
  const pathname = usePathname();
  const params: DiscoverListFiltersParams = toDiscoverFilters(filters);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError } = useInfiniteQuery({
    queryKey: queryKeys.communityExplore(params),
    queryFn: ({ pageParam }) => getDiscoverLists(pageParam, PAGE_SIZE, params),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    initialData: { pages: [initial], pageParams: [1] },
    staleTime: 30_000,
  });

  const lists = data.pages.flatMap((page) => page.lists);

  if (lists.length === 0) {
    return (
      <EmptyState
        title={t("community.noResultsTitle")}
        description={t("community.noResultsDescription")}
        action={
          <Button variant="secondary" onClick={() => router.replace(pathname, { scroll: false })}>
            {t("clearFilters")}
          </Button>
        }
      />
    );
  }

  return (
    <section aria-label={t("community.resultsLabel")} className="flex w-full flex-col gap-4">
      <p role="status" aria-live="polite" className="font-data text-xs text-paper-muted">
        {t("community.resultsCount", { count: lists.length })}
      </p>

      <ListsGrid cols={3}>
        {lists.map((list) => (
          <CommunityListCard key={list.id} list={list} canSave={canSave} dense />
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
    </section>
  );
}
