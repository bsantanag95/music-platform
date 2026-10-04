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
import { RatingDetailDialog } from "@/components/album/RatingDetailDialog";
import { getMyRatings, type MyRatingsFiltersParams } from "@/lib/api/ratings";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type {
  MyRatingEntry,
  MyRatingGroup,
  MyRatingSort,
  MyRatingTargetType,
  MyRatingsListResponse,
  RatingsResponse,
} from "@/lib/api/schemas";
import {
  EMPTY_RATING_FILTERS,
  RatingsToolbar,
  ratingFiltersActive,
  type RatingsFiltersState,
} from "./RatingsToolbar";
import { RatingsModeSwitcher } from "./RatingsModeSwitcher";
import { RatingsDetailed } from "./RatingsDetailed";
import { RatingsIndex } from "./RatingsIndex";
import { RatingsGraphic } from "./RatingsGraphic";
import { useRatingViewMode } from "./use-rating-view-mode";
import {
  RATINGS_PAGE_SIZE,
  applyRatingsResponse,
  displayForGroup,
  groupRatingsByArtist,
  groupRatingsByType,
  ownForDialog,
  sectionTitleKey,
} from "./ratings-shared";
import type { RatingsRowActions } from "./ratings-view";

interface MyRatingsListProps {
  initial: MyRatingsListResponse;
  initialFilters?: MyRatingsFiltersParams;
}

function toFiltersState(params?: MyRatingsFiltersParams): RatingsFiltersState {
  return {
    q: params?.q ?? "",
    sort: params?.sort ?? "best",
    stars: params?.stars !== undefined ? String(params.stars) : "",
    type: params?.type ?? "",
    year: params?.year !== undefined ? String(params.year) : "",
    decade: params?.decade !== undefined ? String(params.decade) : "",
    group: params?.group ?? "type",
  };
}

function toApiFilters(filters: RatingsFiltersState): MyRatingsFiltersParams {
  return {
    q: filters.q.trim() || undefined,
    sort: filters.sort === "best" ? undefined : (filters.sort as MyRatingSort),
    stars: filters.stars ? Number(filters.stars) : undefined,
    type: (filters.type || undefined) as MyRatingTargetType | undefined,
    year: filters.year ? Number(filters.year) : undefined,
    decade: filters.decade ? Number(filters.decade) : undefined,
    group: filters.group === "type" ? undefined : (filters.group as MyRatingGroup),
  };
}

function sameFilters(a: RatingsFiltersState, b: RatingsFiltersState): boolean {
  return (
    a.q.trim() === b.q.trim() &&
    a.sort === b.sort &&
    a.stars === b.stars &&
    a.type === b.type &&
    a.year === b.year &&
    a.decade === b.decade &&
    a.group === b.group
  );
}

// Refleja filtros, búsqueda, orden y agrupación en la URL; el modo de visualización no va
// acá (es preferencia del dispositivo, vive en `localStorage`).
function syncQueryString(filters: RatingsFiltersState) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.sort && filters.sort !== "best") params.set("sort", filters.sort);
  if (filters.stars) params.set("stars", filters.stars);
  if (filters.type) params.set("type", filters.type);
  if (filters.year) params.set("year", filters.year);
  if (filters.decade) params.set("decade", filters.decade);
  if (filters.group !== "type") params.set("group", filters.group);
  const query = params.toString();
  const url = query ? `?${query}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

type RatingsPages = InfiniteData<MyRatingsListResponse, number>;

export function MyRatingsList({ initial, initialFilters }: MyRatingsListProps) {
  const t = useTranslations("ratings");
  const [mode, setMode] = useRatingViewMode();

  const seededState = useMemo(() => toFiltersState(initialFilters), [initialFilters]);
  const [filters, setFilters] = useState<RatingsFiltersState>(seededState);
  const [searchInput, setSearchInput] = useState(seededState.q);
  const [items, setItems] = useState<MyRatingEntry[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [counts, setCounts] = useState(initial.counts);
  const [editing, setEditing] = useState<MyRatingEntry | null>(null);
  const [announce, setAnnounce] = useState("");

  // Debounce del buscador: espera a que la persona deje de tipear.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setFilters((current) => (current.q === searchInput ? current : { ...current, q: searchInput }));
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);
  const queryKey = queryKeys.myRatings(apiFilters);
  const seeded = useMemo(() => sameFilters(filters, seededState), [filters, seededState]);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError } =
    useInfiniteQuery<MyRatingsListResponse, ApiError, RatingsPages, typeof queryKey, number>({
      queryKey,
      queryFn: ({ pageParam }) => getMyRatings(pageParam, RATINGS_PAGE_SIZE, apiFilters),
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
      setCounts(data.pages[0]?.counts ?? { "release-group": 0, recording: 0 });
    }
  }, [data]);

  useEffect(() => {
    syncQueryString(filters);
  }, [filters]);

  const isFiltered = ratingFiltersActive(filters);
  const availableYears = data?.pages[0]?.facets.years ?? initial.facets.years;

  const updateLocal = useCallback((id: string, entry: MyRatingEntry) => {
    setItems((current) => current.map((item) => (item.id === id ? entry : item)));
  }, []);

  const deleteLocal = useCallback(
    (entry: MyRatingEntry) => {
      setItems((current) => current.filter((item) => item.id !== entry.id));
      setTotal((current) => Math.max(0, current - 1));
      setCounts((current) => ({
        ...current,
        [entry.targetType]: Math.max(0, current[entry.targetType] - 1),
      }));
      setAnnounce(t("deletedAnnouncement"));
    },
    [t],
  );

  // Una sola instancia del diálogo para las tres vistas: cada entrada solo pide abrirla.
  const handleDialogChange = (ratings: RatingsResponse) => {
    if (!editing) return;
    const next = applyRatingsResponse(editing, ratings);
    if (next) updateLocal(editing.id, next);
    else deleteLocal(editing);
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_RATING_FILTERS);
  };

  const loadMore = () => {
    const before = items.length;
    void fetchNextPage().then((result) => {
      const after = result.data?.pages.flatMap((page) => page.items).length ?? before;
      if (after > before) setAnnounce(t("loadedAnnouncement", { count: after - before }));
    });
  };

  const rowActions: RatingsRowActions = { onUpdate: updateLocal, onEdit: setEditing };
  const display = displayForGroup(filters.group);
  const Renderer = mode === "detailed" ? RatingsDetailed : mode === "index" ? RatingsIndex : RatingsGraphic;
  const typeGroups = filters.group === "type" ? groupRatingsByType(items) : null;
  const artistGroups = filters.group === "artist" ? groupRatingsByArtist(items) : null;

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
    <div className={`flex w-full flex-col gap-5 ${mode === "graphic" ? "max-w-5xl" : "max-w-3xl"}`}>
      <p className="font-data text-xs text-paper-muted">
        <span>{t("totalLabel", { count: total })}</span>
        <span aria-hidden> · </span>
        <span>{t("countAlbums", { count: counts["release-group"] })}</span>
        <span aria-hidden> · </span>
        <span>{t("countSongs", { count: counts.recording })}</span>
      </p>

      <RatingsToolbar
        filters={filters}
        onChange={setFilters}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        onClear={clearFilters}
        availableYears={availableYears}
      />

      {items.length > 0 ? (
        <div className="flex items-center justify-end">
          <RatingsModeSwitcher mode={mode} onChange={setMode} />
        </div>
      ) : null}

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>

      {items.length === 0 ? (
        emptyBlock
      ) : artistGroups ? (
        // Una sección por artista principal; dentro, Álbumes y Canciones por separado para no
        // confundir una canción con un álbum. Sin contador: la sección puede quedar cortada entre
        // páginas y el servidor no devuelve totales por artista.
        <div className="flex flex-col gap-10">
          {artistGroups.map((group) => (
            <section key={group.key} className="flex flex-col gap-4">
              <h2 className="font-display text-lg text-paper">
                {group.href && group.artistName ? (
                  <Link href={group.href} className="transition-colors hover:text-amber">
                    {group.artistName}
                  </Link>
                ) : (
                  (group.artistName ?? t("sectionNoArtist"))
                )}
              </h2>
              {group.byType.map((sub) => (
                <div key={sub.type} className="flex flex-col gap-2">
                  <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted">
                    {t(sectionTitleKey(sub.type))}
                  </h3>
                  <Renderer entries={sub.entries} actions={rowActions} display={display} />
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : typeGroups ? (
        <div className="flex flex-col gap-8">
          {typeGroups.map((group) => (
            <section key={group.type} className="flex flex-col gap-3">
              <h2 className="flex items-baseline gap-2 font-display text-lg text-paper">
                {t(sectionTitleKey(group.type))}
                <span className="font-data text-xs text-paper-muted">{counts[group.type]}</span>
              </h2>
              <Renderer entries={group.entries} actions={rowActions} display={display} />
            </section>
          ))}
        </div>
      ) : (
        <Renderer entries={items} actions={rowActions} display={display} />
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

      {editing ? (
        <RatingDetailDialog
          open
          onClose={() => setEditing(null)}
          target={{ type: editing.targetType, id: editing.target.id }}
          own={ownForDialog(editing)}
          onChange={handleDialogChange}
        />
      ) : null}
    </div>
  );
}
