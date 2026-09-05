"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { getDiscoverLists } from "@/lib/api/lists";
import { queryKeys } from "@/lib/query/keys";
import type { DiscoverListsResponse } from "@/lib/api/schemas";
import { ListCard } from "./ListCard";
import { SaveListButton } from "./SaveListButton";
import { ListsGrid, entityTypeKey } from "./lists-shared";

const PAGE_SIZE = 20;

// Pestaña "Descubrir": listas públicas de la comunidad, orden cronológico. Sin
// recomendación algorítmica — es una vidriera, no un "para vos".
export function DiscoverListsTab({ initial }: { initial: DiscoverListsResponse }) {
  const t = useTranslations("lists");

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError } = useInfiniteQuery({
    queryKey: queryKeys.discoverLists(),
    queryFn: ({ pageParam }) => getDiscoverLists(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    initialData: { pages: [initial], pageParams: [1] },
    staleTime: 30_000,
  });

  const lists = data?.pages.flatMap((page) => page.lists) ?? initial.lists;

  if (lists.length === 0) {
    return (
      <EmptyState title={t("discoverEmptyTitle")} description={t("discoverEmptyDescription")} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-data text-xs text-paper-muted">{t("discoverHint")}</p>
      <ListsGrid>
        {lists.map((list) => (
          <ListCard
            key={list.id}
            href={`/users/${encodeURIComponent(list.owner.username)}/lists/${list.id}`}
            title={list.title}
            coverThumbs={list.coverThumbs}
            description={list.description}
            meta={
              <>
                <span>{t(entityTypeKey(list.entityType))}</span>
                <span aria-hidden>·</span>
                <span>{t("itemsCount", { count: list.itemCount })}</span>
                <span aria-hidden>·</span>
                <Link
                  href={`/users/${encodeURIComponent(list.owner.username)}`}
                  className="transition-colors hover:text-paper"
                >
                  {t("byOwner", { name: list.owner.displayName ?? `@${list.owner.username}` })}
                </Link>
                <span aria-hidden>·</span>
                <RelativeDate iso={list.createdAt} />
              </>
            }
            action={
              <SaveListButton
                listId={list.id}
                initialSaved={list.saved}
                initialFollowing={list.following}
              />
            }
          />
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
