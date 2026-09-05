"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getSavedLists } from "@/lib/api/lists";
import { queryKeys } from "@/lib/query/keys";
import type { SavedListsResponse } from "@/lib/api/schemas";
import { ListCard } from "./ListCard";
import { SaveListButton } from "./SaveListButton";
import { ListsGrid, entityTypeKey } from "./lists-shared";

const PAGE_SIZE = 20;

// Pestaña "Guardadas": listas ajenas que el usuario marcó. Una lista que dejó
// de ser visible se muestra como "ya no disponible" con la opción de quitarla,
// nunca se filtra en silencio.
export function SavedListsTab({ initial }: { initial: SavedListsResponse }) {
  const t = useTranslations("lists");

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError, refetch } =
    useInfiniteQuery({
      queryKey: queryKeys.savedLists(),
      queryFn: ({ pageParam }) => getSavedLists(pageParam, PAGE_SIZE),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
      initialData: { pages: [initial], pageParams: [1] },
      staleTime: 30_000,
    });

  const lists = data?.pages.flatMap((page) => page.lists) ?? initial.lists;

  if (lists.length === 0) {
    return (
      <EmptyState title={t("savedEmptyTitle")} description={t("savedEmptyDescription")} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ListsGrid>
        {lists.map((list) => (
          <ListCard
            key={list.id}
            href={`/users/${encodeURIComponent(list.owner.username)}/lists/${list.id}`}
            title={list.title}
            coverThumbs={list.coverThumbs}
            description={list.description}
            unavailable={list.unavailable}
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
                {list.unavailable ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="text-danger">{t("unavailable")}</span>
                  </>
                ) : null}
              </>
            }
            action={
              <SaveListButton
                listId={list.id}
                initialSaved
                initialFollowing={list.following}
                onChange={(state) => {
                  if (!state.saved) void refetch();
                }}
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
