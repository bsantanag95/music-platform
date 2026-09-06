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
  getMyCollection,
  getUserCollection,
  removeCollectionEntry,
  updateCollectionEntry,
  updateEntriesAudienceBulk,
  type CollectionQuery,
} from "@/lib/api/collection";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { CollectionEntry, CollectionListResponse, DiaryAudience } from "@/lib/api/schemas";
import { useCollectionViewMode } from "./use-collection-view-mode";
import { CollectionModeSwitcher } from "./CollectionModeSwitcher";
import {
  CollectionToolbar,
  EMPTY_COLLECTION_FILTERS,
  collectionFiltersActive,
  type CollectionFiltersState,
} from "./CollectionToolbar";
import { ShelfGrid } from "./ShelfGrid";
import { EntriesDetailed } from "./EntriesDetailed";
import { EntriesIndex } from "./EntriesIndex";
import {
  groupEntries,
  type CollectionRowActions,
  type CollectionSelectionState,
} from "./collection-shared";
import type { CollectionEntryFormValue } from "./CollectionEntryForm";

const PAGE_SIZE = 20;
const AUDIENCES: DiaryAudience[] = ["private", "followers", "public"];

type CollectionPages = InfiniteData<CollectionListResponse, number>;

interface CollectionShelfProps {
  initial: CollectionListResponse;
  /** Modo lectura (perfil ajeno): sin toolbar, sin edición, sin selección. */
  readOnly?: boolean;
  /** Requerido en modo lectura para paginar la colección del perfil. */
  username?: string;
  initialFilters?: CollectionQuery;
}

function toFiltersState(params?: CollectionQuery): CollectionFiltersState {
  return {
    q: params?.q ?? "",
    format: (params?.format as CollectionFiltersState["format"]) ?? "",
    attribute: (params?.attribute as CollectionFiltersState["attribute"]) ?? "",
    sort: params?.sort ?? "recent",
    group: (params?.group as CollectionFiltersState["group"]) ?? "none",
  };
}

function toApiFilters(filters: CollectionFiltersState): Omit<CollectionQuery, "page" | "pageSize"> {
  return {
    q: filters.q.trim() || undefined,
    format: filters.format || undefined,
    attribute: filters.attribute || undefined,
    sort: filters.sort === "recent" ? undefined : filters.sort,
    group: filters.group === "none" ? undefined : filters.group,
  };
}

function sameFilters(a: CollectionFiltersState, b: CollectionFiltersState): boolean {
  return (
    a.q.trim() === b.q.trim() &&
    a.format === b.format &&
    a.attribute === b.attribute &&
    a.sort === b.sort &&
    a.group === b.group
  );
}

export function CollectionShelf({
  initial,
  readOnly,
  username,
  initialFilters,
}: CollectionShelfProps) {
  const t = useTranslations("collection");
  const queryClient = useQueryClient();
  const [mode, setMode] = useCollectionViewMode();

  const seededState = useMemo(() => toFiltersState(initialFilters), [initialFilters]);
  const [filters, setFilters] = useState<CollectionFiltersState>(seededState);
  const [searchInput, setSearchInput] = useState(seededState.q);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [announce, setAnnounce] = useState("");

  // Debounce del buscador.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setFilters((current) => (current.q === searchInput ? current : { ...current, q: searchInput }));
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const isFiltered = collectionFiltersActive(filters);
  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);
  const mineQueryKey = queryKeys.myCollection(apiFilters);
  const queryKey = readOnly ? (["collection", "user", username] as const) : mineQueryKey;
  const seeded = readOnly || sameFilters(filters, seededState);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError, isPending } =
    useInfiniteQuery<CollectionListResponse, ApiError, CollectionPages, typeof queryKey, number>({
      queryKey,
      queryFn: ({ pageParam }) =>
        readOnly && username
          ? getUserCollection(username, { page: pageParam, pageSize: PAGE_SIZE })
          : getMyCollection({ page: pageParam, pageSize: PAGE_SIZE, ...apiFilters }),
      initialPageParam: 1,
      getNextPageParam: (last) => (last?.hasNext ? last.page + 1 : undefined),
      initialData: seeded ? { pages: [initial], pageParams: [1] } : undefined,
      staleTime: 15_000,
      placeholderData: keepPreviousData,
    });

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page?.entries ?? []) ?? (seeded ? initial.entries : []),
    [data, seeded, initial.entries],
  );
  const counts = data?.pages[0]?.counts ?? initial.counts;

  const groups = useMemo(
    () =>
      groupEntries(
        entries,
        filters.group,
        (format) => t(`format.${format}`),
        t("unknownArtist"),
      ),
    [entries, filters.group, t],
  );

  const invalidateMine = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["collection", "mine"], exact: false }),
    [queryClient],
  );

  const patchLocal = useCallback(
    (mutate: (entry: CollectionEntry) => CollectionEntry | null) => {
      queryClient.setQueryData<CollectionPages>(mineQueryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, pageIndex) => {
            let counts = page.counts;
            const nextEntries: CollectionEntry[] = [];
            for (const entry of page.entries) {
              const result = mutate(entry);
              if (result === null) {
                if (pageIndex === 0) {
                  counts = {
                    ...counts,
                    [entry.format]: Math.max(0, counts[entry.format] - 1),
                  };
                }
                continue;
              }
              nextEntries.push(result);
            }
            return { ...page, entries: nextEntries, counts };
          }),
        };
      });
    },
    [queryClient, mineQueryKey],
  );

  const handleAudienceChange = async (entry: CollectionEntry, audience: DiaryAudience) => {
    if (entry.audience === audience) return;
    const snapshot = queryClient.getQueryData<CollectionPages>(mineQueryKey);
    setBusyId(entry.id);
    setActionError(false);
    patchLocal((item) => (item.id === entry.id ? { ...item, audience } : item));
    try {
      await updateCollectionEntry(entry.id, { audience });
    } catch {
      if (snapshot) queryClient.setQueryData(mineQueryKey, snapshot);
      setActionError(true);
    } finally {
      setBusyId(null);
      void invalidateMine();
    }
  };

  const handleSaveEdit = async (entry: CollectionEntry, value: CollectionEntryFormValue) => {
    const snapshot = queryClient.getQueryData<CollectionPages>(mineQueryKey);
    setBusyId(entry.id);
    setActionError(false);
    const note = value.note.trim() === "" ? null : value.note.trim();
    patchLocal((item) =>
      item.id === entry.id
        ? { ...item, format: value.format, attributes: value.attributes, note, audience: value.audience }
        : item,
    );
    if (value.format !== entry.format) {
      // El cambio de formato mueve la entrada de casillero en el conteo-retrato.
      queryClient.setQueryData<CollectionPages>(mineQueryKey, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page, index) =>
                index === 0
                  ? {
                      ...page,
                      counts: {
                        ...page.counts,
                        [entry.format]: Math.max(0, page.counts[entry.format] - 1),
                        [value.format]: page.counts[value.format] + 1,
                      },
                    }
                  : page,
              ),
            }
          : old,
      );
    }
    try {
      await updateCollectionEntry(entry.id, {
        format: value.format,
        attributes: value.attributes,
        note,
        audience: value.audience,
      });
      setEditingId(null);
    } catch {
      if (snapshot) queryClient.setQueryData(mineQueryKey, snapshot);
      setActionError(true);
    } finally {
      setBusyId(null);
      void invalidateMine();
    }
  };

  const handleRemove = async (entry: CollectionEntry) => {
    const snapshot = queryClient.getQueryData<CollectionPages>(mineQueryKey);
    setBusyId(entry.id);
    setActionError(false);
    patchLocal((item) => (item.id === entry.id ? null : item));
    try {
      await removeCollectionEntry(entry.id);
    } catch (error) {
      const gone = error instanceof ApiError && error.code === "COLLECTION_ENTRY_NOT_FOUND";
      if (!gone && snapshot) {
        queryClient.setQueryData(mineQueryKey, snapshot);
        setActionError(true);
      }
    } finally {
      setBusyId(null);
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
    const snapshot = queryClient.getQueryData<CollectionPages>(mineQueryKey);
    setBulkBusy(true);
    setActionError(false);
    patchLocal((item) => (ids.includes(item.id) ? { ...item, audience } : item));
    try {
      await updateEntriesAudienceBulk(ids, audience);
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
    setFilters(EMPTY_COLLECTION_FILTERS);
  };

  const loadMore = () => {
    const before = entries.length;
    void fetchNextPage().then((result) => {
      const after = result.data?.pages.flatMap((page) => page.entries).length ?? before;
      if (after > before) setAnnounce(t("loadedAnnouncement", { count: after - before }));
    });
  };

  const actions: CollectionRowActions | null = readOnly
    ? null
    : {
        busyId,
        editingId,
        onStartEdit: setEditingId,
        onCancelEdit: () => setEditingId(null),
        onSaveEdit: handleSaveEdit,
        onAudienceChange: handleAudienceChange,
        onRemove: handleRemove,
      };

  const selection: CollectionSelectionState | null =
    !readOnly && selectionMode ? { active: true, selectedIds, onToggle: toggleSelect } : null;

  const Renderer = mode === "detailed" ? EntriesDetailed : mode === "index" ? EntriesIndex : ShelfGrid;

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
          {t("countVinyl", { count: counts.vinyl })}
          <span aria-hidden> · </span>
          {t("countCd", { count: counts.cd })}
          <span aria-hidden> · </span>
          {t("countCassette", { count: counts.cassette })}
          <span aria-hidden> · </span>
          {t("countOther", { count: counts.other })}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {!readOnly && entries.length > 0 ? (
          <Button
            variant="secondary"
            onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
          >
            {selectionMode ? t("selectionDone") : t("selectMode")}
          </Button>
        ) : (
          <span />
        )}
        <CollectionModeSwitcher mode={mode} onChange={setMode} />
      </div>

      {!readOnly ? (
        <CollectionToolbar
          filters={filters}
          onChange={setFilters}
          searchInput={searchInput}
          onSearchInput={setSearchInput}
          onClear={clearFilters}
        />
      ) : null}

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>

      {entries.length === 0 && !isPending ? (
        emptyBlock
      ) : (
        <Renderer groups={groups} actions={actions} selection={selection} />
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
