"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  addCollectionEntry,
  getMyCollection,
  getUserCollection,
  removeCollectionEntry,
  updateCollectionEntry,
  updateEntriesAudienceBulk,
  type CollectionQuery,
} from "@/lib/api/collection";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { UndoToast } from "@/components/ui/UndoToast";
import { compatibleAttributes } from "@/services/collection/vocabulary";
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
import { CollectionPlaceholder } from "./CollectionPlaceholder";
import { CollectionFormatSegments } from "./CollectionFormatSegments";
import { useReportCollectionTotal } from "./CollectionTabs";
import {
  PRIORITY_COVERS,
  groupEntries,
  writeFiltersToUrl,
  type CollectionRowActions,
  type CollectionSelectionState,
} from "./collection-shared";
import type { CollectionEntryFormValue } from "./CollectionEntryForm";
import { CollectionEditSheet } from "./CollectionEditSheet";

const PAGE_SIZE = 20;
const AUDIENCES: DiaryAudience[] = ["private", "followers", "public"];

// Botones de la barra de selección: una fila, cada uno sin partirse.
const BAR_BUTTON =
  "shrink-0 rounded border border-ink-border px-2 py-1 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper disabled:opacity-50 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:px-3";

type CollectionPages = InfiniteData<CollectionListResponse, number>;

/** Copia recién quitada que el aviso ofrece restaurar. */
interface UndoState {
  entry: CollectionEntry;
  undoing: boolean;
  failed: boolean;
}

interface CollectionShelfProps {
  initial: CollectionListResponse;
  /**
   * Modo lectura (`/users/[username]/collection`): mismos conteos, buscador y
   * filtros que la colección propia, pero sin edición ni selección. Requiere
   * `username` para paginar la colección del perfil.
   */
  readOnly?: boolean;
  username?: string;
  initialFilters?: CollectionQuery;
  /**
   * "Cómo te ven": el dueño previsualiza su perfil como visitante anónimo.
   * Sin esto, un refetch en cliente (p. ej. al recuperar el foco de la
   * pestaña tras el staleTime) pagina con `/api/users/[username]/collection`,
   * que resuelve la sesión real del dueño y desbloquea lo de audiencia
   * "seguidores" que la carga inicial anónima había ocultado.
   */
  preview?: boolean;
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
  preview,
}: CollectionShelfProps) {
  const t = useTranslations("collection");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [mode, setMode, modeReady] = useCollectionViewMode();

  const seededState = useMemo(() => toFiltersState(initialFilters), [initialFilters]);
  const [filters, setFilters] = useState<CollectionFiltersState>(seededState);
  const [searchInput, setSearchInput] = useState(seededState.q);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<CollectionEntry | null>(null);
  const [editError, setEditError] = useState(false);
  const [confirmBulkRemove, setConfirmBulkRemove] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);
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

  // Los filtros viajan a la URL (sin historial): recargar o compartir abre la misma selección. Las demás claves
  // (`tab`, `preview`) se conservan.
  useEffect(() => {
    writeFiltersToUrl({
      q: apiFilters.q,
      format: apiFilters.format,
      attribute: apiFilters.attribute,
      sort: apiFilters.sort,
      group: apiFilters.group,
    });
  }, [apiFilters]);
  const mineQueryKey = queryKeys.myCollection(apiFilters);
  const queryKey = readOnly
    ? (["collection", "user", username, preview, apiFilters] as const)
    : mineQueryKey;
  const seeded = sameFilters(filters, seededState);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError, isPending } =
    useInfiniteQuery<CollectionListResponse, ApiError, CollectionPages, typeof queryKey, number>({
      queryKey,
      queryFn: ({ pageParam }) =>
        readOnly && username
          ? getUserCollection(username, { page: pageParam, pageSize: PAGE_SIZE, preview, ...apiFilters })
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
  // La cifra de la pestaña Tengo (sin filtros); en el perfil no hay pestañas ni `total`.
  useReportCollectionTotal("own", readOnly ? undefined : (data?.pages[0]?.total ?? initial.total));

  const groups = useMemo(
    () =>
      groupEntries(
        entries,
        filters.group,
        (format) => t(`format.${format}`),
        t("unknownArtist"),
        (iso) => new Date(iso).toLocaleDateString(locale, { month: "long", year: "numeric" }),
      ),
    [entries, filters.group, t, locale],
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
            let total = page.total;
            const nextEntries: CollectionEntry[] = [];
            for (const entry of page.entries) {
              const result = mutate(entry);
              if (result === null) {
                if (pageIndex === 0) {
                  counts = {
                    ...counts,
                    [entry.format]: Math.max(0, counts[entry.format] - 1),
                  };
                  if (total !== undefined) total = Math.max(0, total - 1);
                }
                continue;
              }
              nextEntries.push(result);
            }
            return { ...page, entries: nextEntries, counts, total };
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
    setEditError(false);
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
      setEditing(null);
    } catch {
      if (snapshot) queryClient.setQueryData(mineQueryKey, snapshot);
      // El error se muestra en la hoja, que sigue abierta con el borrador.
      setEditError(true);
    } finally {
      setBusyId(null);
      void invalidateMine();
    }
  };

  const handleRemove = async (entry: CollectionEntry) => {
    const snapshot = queryClient.getQueryData<CollectionPages>(mineQueryKey);
    setBusyId(entry.id);
    setActionError(false);
    setErrorId(null);
    patchLocal((item) => (item.id === entry.id ? null : item));
    try {
      await removeCollectionEntry(entry.id);
      setAnnounce(t("removedAnnouncement", { title: entry.album.title || t("albumUnavailable") }));
      setUndo({ entry, undoing: false, failed: false });
    } catch (error) {
      const gone = error instanceof ApiError && error.code === "COLLECTION_ENTRY_NOT_FOUND";
      if (!gone && snapshot) {
        queryClient.setQueryData(mineQueryKey, snapshot);
        setErrorId(entry.id);
      }
    } finally {
      setBusyId(null);
      void invalidateMine();
    }
  };

  const clearUndo = useCallback(() => setUndo(null), []);

  // Deshacer vuelve a crear la copia con los mismos datos (es una entrada nueva: su fecha de alta cambia). Los
  // atributos que no aplican al formato quedan fuera: el servidor rechazaría la copia heredada incoherente.
  const handleUndo = async () => {
    if (!undo || undo.undoing) return;
    const { entry } = undo;
    setUndo({ ...undo, undoing: true });
    try {
      await addCollectionEntry({
        releaseGroupId: entry.album.id,
        format: entry.format,
        attributes: compatibleAttributes(entry.format, entry.attributes),
        note: entry.note,
        audience: entry.audience,
      });
      setUndo(null);
      setAnnounce(t("restoredAnnouncement", { title: entry.album.title || t("albumUnavailable") }));
    } catch {
      setUndo({ entry, undoing: false, failed: true });
    } finally {
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
    setConfirmBulkRemove(false);
    setAnnounce("");
  }, []);

  const selectAll = () => {
    const next = new Set(entries.map((entry) => entry.id));
    setSelectedIds(next);
    setAnnounce(t("selectedCount", { count: next.size }));
  };

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

  // Quitar en lote (openspec: redesign-collection-views, D8): no hay `DELETE` en lote, así que se quita cada copia y,
  // si alguna falla, se restaura toda la lista y se avisa. Sin "Deshacer": se pide confirmación antes.
  const handleBulkRemove = async () => {
    const chosen = entries.filter((entry) => selectedIds.has(entry.id));
    if (chosen.length === 0) return;
    const snapshot = queryClient.getQueryData<CollectionPages>(mineQueryKey);
    setBulkBusy(true);
    setActionError(false);
    setErrorId(null);
    setConfirmBulkRemove(false);
    const ids = new Set(chosen.map((entry) => entry.id));
    patchLocal((item) => (ids.has(item.id) ? null : item));
    const results = await Promise.allSettled(chosen.map((entry) => removeCollectionEntry(entry.id)));
    const failed = results.some(
      (result) =>
        result.status === "rejected" &&
        !(result.reason instanceof ApiError && result.reason.code === "COLLECTION_ENTRY_NOT_FOUND"),
    );
    if (failed) {
      if (snapshot) queryClient.setQueryData(mineQueryKey, snapshot);
      setActionError(true);
    } else {
      exitSelection();
      setAnnounce(t("bulkRemovedAnnouncement", { count: chosen.length }));
    }
    setBulkBusy(false);
    void invalidateMine();
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
        onEdit: (entry) => {
          setEditError(false);
          setEditing(entry);
        },
        onAudienceChange: handleAudienceChange,
        onRemove: handleRemove,
        errorId,
      };

  const selection: CollectionSelectionState | null =
    !readOnly && selectionMode ? { active: true, selectedIds, onToggle: toggleSelect } : null;

  const Renderer = mode === "detailed" ? EntriesDetailed : mode === "index" ? EntriesIndex : ShelfGrid;
  const priorityIds = useMemo(
    () => new Set(entries.slice(0, PRIORITY_COVERS).map((entry) => entry.id)),
    [entries],
  );

  const emptyBlock = isFiltered ? (
    <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
  ) : readOnly ? (
    <EmptyState title={t("profileEmptyTitle")} description={t("profileEmptyDescription")} />
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
    <div className="flex w-full flex-col gap-5">
      {/* Retrato por formato a la izquierda; modo de vista y "Seleccionar" a la derecha, en la misma fila. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 max-w-full">
          <CollectionFormatSegments
            counts={counts}
            value={filters.format}
            onChange={(format) => setFilters((current) => ({ ...current, format }))}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className={modeReady ? "" : "invisible"} aria-hidden={modeReady ? undefined : true}>
            <CollectionModeSwitcher mode={mode} onChange={setMode} iconsOnly />
          </div>
          {!readOnly && entries.length > 0 ? (
            <button
              type="button"
              aria-pressed={selectionMode}
              onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
              className={`inline-flex h-10 items-center rounded-md border px-3 font-data text-xs transition-colors [@media(pointer:coarse)]:h-11 ${
                selectionMode
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-ink-border text-paper-muted hover:text-paper"
              }`}
            >
              {selectionMode ? t("selectionDone") : t("selectMode")}
            </button>
          ) : null}
        </div>
      </div>

      <CollectionToolbar
        filters={filters}
        onChange={setFilters}
        searchInput={searchInput}
        onSearchInput={setSearchInput}
        onClear={clearFilters}
      />

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>

      {entries.length === 0 && !isPending ? (
        emptyBlock
      ) : !modeReady ? (
        <CollectionPlaceholder />
      ) : (
        <Renderer
          groups={groups}
          actions={actions}
          selection={selection}
          priorityIds={priorityIds}
          groupedByArtist={filters.group === "artist"}
        />
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

      {undo ? (
        <UndoToast
          key={undo.entry.id}
          message={
            undo.failed
              ? t("undoError")
              : t("removedToast", { title: undo.entry.album.title || t("albumUnavailable") })
          }
          undoLabel={t("undo")}
          onUndo={undo.failed ? undefined : () => void handleUndo()}
          onExpire={clearUndo}
          undoing={undo.undoing}
        />
      ) : null}

      {editing ? (
        <CollectionEditSheet
          key={editing.id}
          entry={editing}
          busy={busyId === editing.id}
          error={editError}
          onSave={(entry, value) => void handleSaveEdit(entry, value)}
          onCancel={() => setEditing(null)}
          onRemove={(entry) => {
            setEditing(null);
            void handleRemove(entry);
          }}
        />
      ) : null}

      {selectionMode ? (
        <div
          role="region"
          aria-label={t("bulkBarLabel")}
          className="sticky bottom-4 z-10 mx-auto flex w-full max-w-full items-center gap-2 overflow-x-auto rounded-lg border border-amber bg-ink-surface px-3 py-2 sm:w-auto"
        >
          <span className="shrink-0 font-data text-xs text-paper">
            {t("selectedCount", { count: selectedIds.size })}
          </span>
          <button type="button" onClick={selectAll} className={BAR_BUTTON}>
            {t("selectAll")}
          </button>
          {selectedIds.size > 0 ? (
            <>
              <span aria-hidden className="h-5 w-px shrink-0 bg-ink-border" />
              <span className="shrink-0 font-data text-xs text-paper-muted">{t("changeAudience")}</span>
              {AUDIENCES.map((audience) => (
                <button
                  key={audience}
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => void handleBulkAudience(audience)}
                  className={BAR_BUTTON}
                >
                  {t(`audience.${audience}`)}
                </button>
              ))}
              <span aria-hidden className="h-5 w-px shrink-0 bg-ink-border" />
              {confirmBulkRemove ? (
                <>
                  <span className="shrink-0 font-data text-xs text-paper">
                    {t("bulkRemoveConfirm", { count: selectedIds.size })}
                  </span>
                  <button
                    type="button"
                    disabled={bulkBusy}
                    onClick={() => void handleBulkRemove()}
                    className={`${BAR_BUTTON} border-danger text-danger hover:bg-danger/10`}
                  >
                    {t("bulkRemove")}
                  </button>
                  <button type="button" onClick={() => setConfirmBulkRemove(false)} className={BAR_BUTTON}>
                    {t("cancelEdit")}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => setConfirmBulkRemove(true)}
                  className={`${BAR_BUTTON} text-danger hover:border-danger`}
                >
                  {t("bulkRemoveStart")}
                </button>
              )}
            </>
          ) : null}
          <button
            type="button"
            onClick={exitSelection}
            aria-label={t("selectionDone")}
            className="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded text-paper-muted transition-colors hover:text-paper [@media(pointer:coarse)]:size-11"
          >
            <span aria-hidden>✕</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
