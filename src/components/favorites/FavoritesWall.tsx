"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getMyFavorites,
  getUserFavorites,
  removeFavorite,
  updateFavoriteAudience,
  updateFavoritesAudienceBulk,
  type FavoritesFiltersParams,
} from "@/lib/api/favorites";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { DiaryAudience, Favorite, FavoritesListResponse } from "@/lib/api/schemas";
import {
  EMPTY_FAVORITE_FILTERS,
  FavoritesToolbar,
  favoriteFiltersActive,
  type FavoritesFiltersState,
} from "./FavoritesToolbar";
import { FavoriteTile } from "./FavoriteTile";
import { groupFavoritesByType, sectionTitleKey } from "./favorites-shared";

const PAGE_SIZE = 20;
const AUDIENCES: DiaryAudience[] = ["private", "followers", "public"];

type FavoritesPages = InfiniteData<FavoritesListResponse, number>;

interface FavoritesWallProps {
  initial: FavoritesListResponse;
  /** Modo lectura (perfil ajeno): sin toolbar, sin edición, sin selección. */
  readOnly?: boolean;
  /** Requerido en modo lectura para paginar los favoritos del perfil. */
  username?: string;
  initialFilters?: FavoritesFiltersParams;
}

function toFiltersState(params?: FavoritesFiltersParams): FavoritesFiltersState {
  return {
    q: params?.q ?? "",
    type: params?.type ?? "",
    audience: params?.audience ?? "",
    sort: params?.sort ?? "recent",
  };
}

function toApiFilters(filters: FavoritesFiltersState): FavoritesFiltersParams {
  return {
    q: filters.q.trim() || undefined,
    type: filters.type || undefined,
    audience: filters.audience || undefined,
    sort: filters.sort === "recent" ? undefined : filters.sort,
  };
}

function sameFilters(a: FavoritesFiltersState, b: FavoritesFiltersState): boolean {
  return a.q.trim() === b.q.trim() && a.type === b.type && a.audience === b.audience && a.sort === b.sort;
}

export function FavoritesWall({ initial, readOnly, username, initialFilters }: FavoritesWallProps) {
  const t = useTranslations("favorites");
  const queryClient = useQueryClient();

  const seededState = useMemo(() => toFiltersState(initialFilters), [initialFilters]);
  const [filters, setFilters] = useState<FavoritesFiltersState>(seededState);
  const [searchInput, setSearchInput] = useState(seededState.q);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [announce, setAnnounce] = useState("");

  // Debounce del buscador: espera a que el usuario deje de tipear.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setFilters((current) => (current.q === searchInput ? current : { ...current, q: searchInput }));
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const isFiltered = favoriteFiltersActive(filters);
  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);
  const mineQueryKey = queryKeys.myFavorites(apiFilters);
  const queryKey = readOnly ? (["favorites", "user", username] as const) : mineQueryKey;

  const seeded = readOnly || sameFilters(filters, seededState);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError, isPending } =
    useInfiniteQuery<FavoritesListResponse, ApiError, FavoritesPages, typeof queryKey, number>({
      queryKey,
      queryFn: ({ pageParam }) =>
        readOnly && username
          ? getUserFavorites(username, pageParam, PAGE_SIZE)
          : getMyFavorites(pageParam, PAGE_SIZE, apiFilters),
      initialPageParam: 1,
      getNextPageParam: (last) => (last?.hasNext ? last.page + 1 : undefined),
      initialData: seeded ? { pages: [initial], pageParams: [1] } : undefined,
      staleTime: 15_000,
      placeholderData: keepPreviousData,
    });

  const favorites =
    data?.pages.flatMap((page) => page?.favorites ?? []) ?? (seeded ? initial.favorites : []);
  const counts = data?.pages[0]?.counts ?? initial.counts;
  const groups = groupFavoritesByType(favorites);

  const invalidateMine = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["favorites", "mine"], exact: false }),
    [queryClient],
  );

  const patchLocalAudience = useCallback(
    (ids: string[], audience: DiaryAudience) => {
      queryClient.setQueryData<FavoritesPages>(mineQueryKey, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                favorites: page.favorites.map((favorite) =>
                  ids.includes(favorite.id) ? { ...favorite, audience } : favorite,
                ),
              })),
            }
          : old,
      );
    },
    [queryClient, mineQueryKey],
  );

  const patchLocalRemove = useCallback(
    (favorite: Favorite) => {
      queryClient.setQueryData<FavoritesPages>(mineQueryKey, (old) => {
        if (!old) return old;
        const key = favorite.targetType;
        return {
          ...old,
          pages: old.pages.map((page, index) => ({
            ...page,
            favorites: page.favorites.filter((item) => item.id !== favorite.id),
            counts:
              index === 0
                ? { ...page.counts, [key]: Math.max(0, page.counts[key] - 1) }
                : page.counts,
          })),
        };
      });
    },
    [queryClient, mineQueryKey],
  );

  const handleAudienceChange = async (favorite: Favorite, audience: DiaryAudience) => {
    if (favorite.audience === audience) return;
    const snapshot = queryClient.getQueryData<FavoritesPages>(mineQueryKey);
    setRowBusyId(favorite.id);
    setActionError(false);
    patchLocalAudience([favorite.id], audience);
    try {
      await updateFavoriteAudience(favorite.id, audience);
    } catch {
      if (snapshot) queryClient.setQueryData(mineQueryKey, snapshot);
      setActionError(true);
    } finally {
      setRowBusyId(null);
      void invalidateMine();
    }
  };

  const handleRemove = async (favorite: Favorite) => {
    const snapshot = queryClient.getQueryData<FavoritesPages>(mineQueryKey);
    setRowBusyId(favorite.id);
    setActionError(false);
    patchLocalRemove(favorite);
    try {
      await removeFavorite({ type: favorite.targetType, id: favorite.target.id });
    } catch (error) {
      const gone = error instanceof ApiError && error.code === "FAVORITE_NOT_FOUND";
      if (!gone && snapshot) {
        queryClient.setQueryData(mineQueryKey, snapshot);
        setActionError(true);
      }
    } finally {
      setRowBusyId(null);
      void invalidateMine();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setAnnounce(t("selectedCount", { count: next.size }));
      return next;
    });
  };

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setAnnounce("");
  }, []);

  useEffect(() => {
    if (!selectionMode) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") exitSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectionMode, exitSelection]);

  const handleBulkAudience = async (audience: DiaryAudience) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const snapshot = queryClient.getQueryData<FavoritesPages>(mineQueryKey);
    setBulkBusy(true);
    setActionError(false);
    patchLocalAudience(ids, audience);
    try {
      await updateFavoritesAudienceBulk(ids, audience);
      exitSelection();
    } catch {
      if (snapshot) queryClient.setQueryData(mineQueryKey, snapshot);
      setActionError(true);
    } finally {
      setBulkBusy(false);
      void invalidateMine();
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_FAVORITE_FILTERS);
  };

  const loadMore = () => {
    const before = favorites.length;
    void fetchNextPage().then((result) => {
      const after = result.data?.pages.flatMap((page) => page.favorites).length ?? before;
      if (after > before) setAnnounce(t("loadedAnnouncement", { count: after - before }));
    });
  };

  const emptyBlock = readOnly ? (
    <EmptyState title={t("profileEmptyTitle")} description={t("profileEmptyDescription")} />
  ) : isFiltered ? (
    <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
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
      {!readOnly ? (
        <p className="font-data text-xs text-paper-muted">
          {t("countArtists", { count: counts.artist })}
          <span aria-hidden> · </span>
          {t("countAlbums", { count: counts["release-group"] })}
          <span aria-hidden> · </span>
          {t("countSongs", { count: counts.recording })}
        </p>
      ) : null}

      {!readOnly ? (
        <FavoritesToolbar
          filters={filters}
          onChange={setFilters}
          searchInput={searchInput}
          onSearchInput={setSearchInput}
          onClear={clearFilters}
        />
      ) : null}

      {!readOnly && favorites.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
          >
            {selectionMode ? t("selectionDone") : t("selectMode")}
          </Button>
        </div>
      ) : null}

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>

      {favorites.length === 0 && !isPending ? (
        emptyBlock
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.type} className="flex flex-col gap-3">
              <h2 className="flex items-baseline gap-2 font-display text-lg text-paper">
                {t(sectionTitleKey(group.type))}
                <span className="font-data text-xs text-paper-muted">{counts[group.type]}</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.favorites.map((favorite) => (
                  <FavoriteTile
                    key={favorite.id}
                    favorite={favorite}
                    readOnly={readOnly}
                    selectionMode={selectionMode}
                    selected={selectedIds.has(favorite.id)}
                    busy={rowBusyId === favorite.id || bulkBusy}
                    onToggleSelect={toggleSelect}
                    onAudienceChange={handleAudienceChange}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {actionError ? (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("saveError")}
        </span>
      ) : null}

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

      {selectionMode && selectedIds.size > 0 ? (
        <div className="sticky bottom-4 z-10 mx-auto flex w-full max-w-md flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-lg border border-amber bg-ink-surface px-4 py-3">
          <span className="font-data text-xs text-paper">
            {t("selectedCount", { count: selectedIds.size })}
          </span>
          <span className="font-data text-xs text-paper-muted">{t("changeAudience")}</span>
          {AUDIENCES.map((audience) => (
            <button
              key={audience}
              type="button"
              disabled={bulkBusy}
              onClick={() => void handleBulkAudience(audience)}
              className="rounded border border-ink-border px-2 py-1 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper disabled:opacity-50"
            >
              {t(`audience.${audience}`)}
            </button>
          ))}
          <button
            type="button"
            onClick={exitSelection}
            className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
          >
            {t("selectionDone")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
