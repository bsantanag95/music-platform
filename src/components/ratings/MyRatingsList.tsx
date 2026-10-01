"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMyRatings, type MyRatingsFiltersParams } from "@/lib/api/ratings";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { MyRatingsListResponse, MyRatingEntry, MyRatingSort, MyRatingTargetType } from "@/lib/api/schemas";
import { MyRatingRow } from "./MyRatingRow";

const PAGE_SIZE = 20;

interface FiltersState {
  sort: MyRatingSort;
  stars: string;
  type: string;
  year: string;
  decade: string;
}

const EMPTY_FILTERS: FiltersState = {
  sort: "best",
  stars: "",
  type: "",
  year: "",
  decade: "",
};

interface MyRatingsListProps {
  initial: MyRatingsListResponse;
  initialFilters?: MyRatingsFiltersParams;
}

function toFiltersState(params?: MyRatingsFiltersParams): FiltersState {
  return {
    sort: params?.sort ?? "best",
    stars: params?.stars !== undefined ? String(params.stars) : "",
    type: params?.type ?? "",
    year: params?.year !== undefined ? String(params.year) : "",
    decade: params?.decade !== undefined ? String(params.decade) : "",
  };
}

function toApiFilters(filters: FiltersState): MyRatingsFiltersParams {
  return {
    sort: filters.sort === "best" ? undefined : filters.sort,
    stars: filters.stars ? Number(filters.stars) : undefined,
    type: (filters.type || undefined) as MyRatingTargetType | undefined,
    year: filters.year ? Number(filters.year) : undefined,
    decade: filters.decade ? Number(filters.decade) : undefined,
  };
}

function filtersActive(filters: FiltersState): boolean {
  return filters.sort !== "best" || Boolean(filters.stars || filters.type || filters.year || filters.decade);
}

function syncQueryString(filters: FiltersState) {
  const params = new URLSearchParams();
  if (filters.sort && filters.sort !== "best") params.set("sort", filters.sort);
  if (filters.stars) params.set("stars", filters.stars);
  if (filters.type) params.set("type", filters.type);
  if (filters.year) params.set("year", filters.year);
  if (filters.decade) params.set("decade", filters.decade);
  const query = params.toString();
  const url = query ? `?${query}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

type RatingsPages = InfiniteData<MyRatingsListResponse, number>;

export function MyRatingsList({ initial, initialFilters }: MyRatingsListProps) {
  const t = useTranslations("ratings");

  const seededState = useMemo(() => toFiltersState(initialFilters), [initialFilters]);
  const [filters, setFilters] = useState<FiltersState>(seededState);
  const [items, setItems] = useState<MyRatingEntry[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [announce, setAnnounce] = useState("");

  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);
  const queryKey = queryKeys.myRatings(apiFilters);

  const seeded = useMemo(() => {
    if (filters.sort !== seededState.sort) return false;
    if (filters.stars !== seededState.stars) return false;
    if (filters.type !== seededState.type) return false;
    if (filters.year !== seededState.year) return false;
    if (filters.decade !== seededState.decade) return false;
    return true;
  }, [filters, seededState]);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError } =
    useInfiniteQuery<MyRatingsListResponse, ApiError, RatingsPages, typeof queryKey, number>({
      queryKey,
      queryFn: ({ pageParam }) => getMyRatings(pageParam, PAGE_SIZE, apiFilters),
      initialPageParam: 1,
      getNextPageParam: (last) => (last?.hasNext ? last.page + 1 : undefined),
      initialData: seeded ? { pages: [initial], pageParams: [1] } : undefined,
      staleTime: 15_000,
      placeholderData: keepPreviousData,
    });

  useEffect(() => {
    if (data) {
      setItems(data.pages.flatMap((page) => page.items));
      setTotal(data.pages[0]?.total ?? 0);
    }
  }, [data]);

  useEffect(() => {
    syncQueryString(filters);
  }, [filters]);

  const isFiltered = filtersActive(filters);
  const availableYears = data?.pages[0]?.facets.years ?? initial.facets.years;

  const updateLocal = useCallback((id: string, entry: MyRatingEntry) => {
    setItems((current) => current.map((item) => (item.id === id ? entry : item)));
  }, []);

  const deleteLocal = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setTotal((current) => Math.max(0, current - 1));
    setAnnounce(t("deletedAnnouncement"));
  }, [t]);

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
  };

  const loadMore = () => {
    const before = items.length;
    void fetchNextPage().then((result) => {
      const after = result.data?.pages.flatMap((page) => page.items).length ?? before;
      if (after > before) setAnnounce(t("loadedAnnouncement", { count: after - before }));
    });
  };

  const emptyBlock = isFiltered ? (
    <EmptyState
      title={t("noResultsTitle")}
      description={t("noResultsDescription")}
      action={
        <Button variant="secondary" onClick={clearFilters}>
          {t("clearFilters")}
        </Button>
      }
    />
  ) : (
    <EmptyState
      title={t("emptyTitle")}
      description={t("emptyDescription")}
      action={
        <Link
          href="/search"
          className="rounded-md border border-ink-border bg-ink-surface px-4 py-2 font-data text-sm text-paper transition-colors hover:border-amber"
        >
          {t("emptyCta")}
        </Link>
      }
    />
  );

  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <p className="font-data text-xs text-paper-muted">{t("totalLabel", { count: total })}</p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          {t("sortLabel")}
          <select
            value={filters.sort}
            onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as MyRatingSort }))}
            className="rounded border border-ink-border bg-ink-surface px-2 py-1 text-paper"
          >
            <option value="best">{t("sortBest")}</option>
            <option value="worst">{t("sortWorst")}</option>
            <option value="recent">{t("sortRecent")}</option>
            <option value="title">{t("sortTitle")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          {t("starsFilterLabel")}
          <select
            value={filters.stars}
            onChange={(event) => setFilters((current) => ({ ...current, stars: event.target.value }))}
            className="rounded border border-ink-border bg-ink-surface px-2 py-1 text-paper"
          >
            <option value="">{t("starsAll")}</option>
            <option value="5">5★</option>
            <option value="4.5">4½★</option>
            <option value="4">4★</option>
            <option value="3.5">3½★</option>
            <option value="3">3★</option>
            <option value="2.5">2½★</option>
            <option value="2">2★</option>
            <option value="1.5">1½★</option>
            <option value="1">1★</option>
            <option value="0.5">½★</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          {t("typeFilterLabel")}
          <select
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
            className="rounded border border-ink-border bg-ink-surface px-2 py-1 text-paper"
          >
            <option value="">{t("typeAll")}</option>
            <option value="release-group">{t("typeAlbum")}</option>
            <option value="recording">{t("typeSong")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          {t("yearFilterLabel")}
          <select
            value={filters.year}
            onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}
            className="rounded border border-ink-border bg-ink-surface px-2 py-1 text-paper"
          >
            <option value="">{t("yearAll")}</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          {t("decadeFilterLabel")}
          <select
            value={filters.decade}
            onChange={(event) => setFilters((current) => ({ ...current, decade: event.target.value }))}
            disabled={Boolean(filters.year)}
            className="rounded border border-ink-border bg-ink-surface px-2 py-1 text-paper disabled:opacity-50"
          >
            <option value="">{t("decadeAll")}</option>
            <option value="2020">2020s</option>
            <option value="2010">2010s</option>
            <option value="2000">2000s</option>
            <option value="1990">1990s</option>
            <option value="1980">1980s</option>
            <option value="1970">1970s</option>
            <option value="1960">1960s</option>
            <option value="1950">1950s</option>
          </select>
        </label>

        {isFiltered ? (
          <Button variant="secondary" onClick={clearFilters} className="self-end">
            {t("clearFilters")}
          </Button>
        ) : null}
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>

      {items.length === 0 ? (
        emptyBlock
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((entry) => (
            <MyRatingRow
              key={entry.id}
              entry={entry}
              onUpdate={updateLocal}
              onDelete={deleteLocal}
            />
          ))}
        </div>
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
          onClick={loadMore}
          className="self-center"
        >
          {isFetchingNextPage ? t("loadingMore") : t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
