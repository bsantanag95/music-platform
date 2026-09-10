"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { getDiscoverLists, getListsFromFollowing, getPopularLists } from "@/lib/api/lists";
import { queryKeys } from "@/lib/query/keys";
import type { DiscoverListsResponse } from "@/lib/api/schemas";
import { CommunityListCard } from "./CommunityListCard";
import { ListsGrid } from "./lists-shared";

const PAGE_SIZE = 20;

type CommunitySource = "popular" | "from-following" | "recent";

const SOURCES = {
  popular: { fetch: getPopularLists, queryKey: queryKeys.popularLists() },
  "from-following": { fetch: getListsFromFollowing, queryKey: queryKeys.listsFromFollowing() },
  recent: { fetch: getDiscoverLists, queryKey: queryKeys.discoverLists() },
} as const satisfies Record<
  CommunitySource,
  { fetch: (page: number, pageSize: number) => Promise<DiscoverListsResponse>; queryKey: readonly unknown[] }
>;

interface CommunityListSectionProps {
  source: CommunitySource;
  /** Clave i18n (namespace `lists`) del encabezado de la sección. */
  headingKey: string;
  initial: DiscoverListsResponse;
  canSave: boolean;
}

// Una sección paginada de `/lists` (Populares, De seguidos, Recientes). La
// primera página llega renderizada del servidor; el resto se pide por
// `useInfiniteQuery` contra el endpoint de la fuente. "Destacadas" no usa este
// componente: es un rail acotado sin paginación.
export function CommunityListSection({
  source,
  headingKey,
  initial,
  canSave,
}: CommunityListSectionProps) {
  const t = useTranslations("lists");
  const { fetch, queryKey } = SOURCES[source];

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetch(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    initialData: { pages: [initial], pageParams: [1] },
    staleTime: 30_000,
  });

  const lists = data?.pages.flatMap((page) => page.lists) ?? initial.lists;
  if (lists.length === 0) return null;

  return (
    <section className="flex w-full flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{t(headingKey)}</h2>
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
    </section>
  );
}
