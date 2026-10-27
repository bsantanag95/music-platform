"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserHoverCard } from "@/components/profiles/UserHoverCard";
import { getSavedLists } from "@/lib/api/lists";
import { queryKeys } from "@/lib/query/keys";
import type { SavedListsResponse } from "@/lib/api/schemas";
import { presentList } from "@/lib/list-presentation";
import { PLATFORM_OWNER_NAME, titleLocaleOf } from "@/services/discovery/collections/titles";
import { ListCard } from "./ListCard";
import { SaveListButton } from "./SaveListButton";
import { ListsGrid, entityTypeKey } from "./lists-shared";
import { ListsToolbar } from "./ListsToolbar";
import { useListsSection } from "./ListsSection";
import { useListFilters, type ListFiltersState } from "./use-list-filters";

const PAGE_SIZE = 20;

// Pestaña "Guardadas": listas ajenas que el usuario marcó. Una lista que dejó
// de ser visible se muestra como "ya no disponible" con la opción de quitarla,
// nunca se filtra en silencio. Misma barra que Mis listas, con filtros en la URL (openspec: redesign-me-lists-toolbar).
export function SavedListsTab({
  initial,
  initialFilters,
}: {
  initial: SavedListsResponse;
  /** Filtros leídos de la URL; `initial` ya viene filtrado con ellos. */
  initialFilters?: Partial<ListFiltersState>;
}) {
  const t = useTranslations("lists");
  const locale = useLocale();
  const { reportTotal } = useListsSection();
  const { filters, setFilters, searchInput, setSearchInput, isFiltered, params, clear } = useListFilters(
    initialFilters,
    { syncUrl: true },
  );
  const [openedKey] = useState(() => JSON.stringify(params));

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError, isPending, refetch } =
    useInfiniteQuery({
      queryKey: queryKeys.savedLists(params),
      queryFn: ({ pageParam }) => getSavedLists(pageParam, PAGE_SIZE, params),
      initialPageParam: 1,
      getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
      initialData: JSON.stringify(params) === openedKey ? { pages: [initial], pageParams: [1] } : undefined,
      staleTime: 30_000,
      placeholderData: keepPreviousData,
    });

  const lists = data?.pages.flatMap((page) => page.lists) ?? [];
  const counts = data?.pages[0]?.counts ?? initial.counts;
  const total = counts.artist + counts["release-group"] + counts.recording;

  // Dejar de guardar una lista baja el total de la pestaña (D4).
  useEffect(() => {
    reportTotal("saved", total);
  }, [total, reportTotal]);

  if (total === 0 && !isFiltered) {
    return (
      <EmptyState title={t("savedEmptyTitle")} description={t("savedEmptyDescription")} />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ListsToolbar
        filters={filters}
        onChange={setFilters}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        isFiltered={isFiltered}
        onClear={clear}
        searchPlaceholder={t("savedSearchPlaceholder")}
        counts={counts}
      />
      {lists.length === 0 && !isPending ? (
        <EmptyState title={t("noResultsTitle")} description={t("savedNoResultsDescription")} />
      ) : null}
      <ListsGrid cols="shelf">
        {lists.map((list) => {
          const shown = presentList(list, locale);
          return (
          <ListCard
            key={list.id}
            layout="shelf"
            href={shown.href}
            title={shown.title}
            coverThumbs={list.coverThumbs}
      itemCount={list.itemCount}
      entityType={list.entityType}
            description={list.description}
            unavailable={list.unavailable}
            meta={
              <>
                <span>{t(entityTypeKey(list.entityType))}</span>
                <span aria-hidden>·</span>
                <span>{t("itemsCount", { count: list.itemCount })}</span>
                <span aria-hidden>·</span>
                {list.generated ? (
                  // Una colección generada es de la plataforma, no de un usuario: sin perfil al que enlazar.
                  <span>{t("byOwner", { name: PLATFORM_OWNER_NAME[titleLocaleOf(locale)] })}</span>
                ) : (
                  <UserHoverCard username={list.owner.username}>
                    <Link
                      href={`/users/${encodeURIComponent(list.owner.username)}`}
                      className="transition-colors hover:text-paper"
                    >
                      {t("byOwner", { name: list.owner.displayName ?? `@${list.owner.username}` })}
                    </Link>
                  </UserHoverCard>
                )}
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
                key={`${list.id}:${list.following}`}
                listId={list.id}
                initialSaved
                initialFollowing={list.following}
                onChange={(state) => {
                  if (!state.saved) void refetch();
                }}
              />
            }
          />
          );
        })}
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
