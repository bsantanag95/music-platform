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
import { CoverThumb } from "@/components/catalog/CoverThumb";
import {
  addWantedEntries,
  getMyWantedEntries,
  removeWantedEntry,
  updateWantedEntry,
  type WantedQuery,
} from "@/lib/api/wanted";
import { UndoToast } from "@/components/ui/UndoToast";
import { compatibleAttributes } from "@/services/collection/vocabulary";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { albumHref, artistHref } from "@/lib/catalog-links";
import { ToolbarSelect } from "./ToolbarSelect";
import { useReportCollectionTotal } from "./CollectionTabs";
import { PRIORITY_COVERS, formatCollectionDate, writeFiltersToUrl } from "./collection-shared";
import {
  WantedVariantForm,
  wantedEntryToFormValue,
  type WantedVariantFormValue,
} from "./WantedVariantForm";
import type { WantedEntry, WantedListResponse, WantedSort } from "@/lib/api/schemas";

const PAGE_SIZE = 20;

type WantedPages = InfiniteData<WantedListResponse, number>;

/** Variante recién quitada que el aviso ofrece restaurar. */
interface UndoState {
  entry: WantedEntry;
  undoing: boolean;
  failed: boolean;
}

// Controles de texto de cada fila: el mismo estilo que los de la pestaña Tengo.
const ROW_ACTION =
  "font-data text-xs text-paper-muted underline decoration-dotted transition-colors disabled:opacity-50 [@media(pointer:coarse)]:min-h-11";

interface WantedShelfProps {
  initial: WantedListResponse;
  initialFilters?: WantedQuery;
}

interface WantedFiltersState {
  q: string;
  sort: WantedSort;
}

function toFiltersState(params?: WantedQuery): WantedFiltersState {
  return { q: params?.q ?? "", sort: params?.sort ?? "recent" };
}

function toApiFilters(filters: WantedFiltersState): Omit<WantedQuery, "page" | "pageSize"> {
  return {
    q: filters.q.trim() || undefined,
    sort: filters.sort === "recent" ? undefined : filters.sort,
  };
}

function sameFilters(a: WantedFiltersState, b: WantedFiltersState): boolean {
  return a.q.trim() === b.q.trim() && a.sort === b.sort;
}

// Pestaña "Quiero" de /me/collection: lista simple (sin los tres modos de
// visualización, filtro por formato/atributo, agrupación ni audiencia en
// lote de la pestaña "Tengo" — ver design.md D5 de add-collection-wishlist).
// La audiencia por entrada se muestra en la fila y se edita en el panel de
// edición (expand-feed-coverage).
export function WantedShelf({ initial, initialFilters }: WantedShelfProps) {
  const t = useTranslations("collection");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const seededState = useMemo(() => toFiltersState(initialFilters), [initialFilters]);
  const [filters, setFilters] = useState<WantedFiltersState>(seededState);
  const [searchInput, setSearchInput] = useState(seededState.q);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<WantedVariantFormValue | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setFilters((current) => (current.q === searchInput ? current : { ...current, q: searchInput }));
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const isFiltered = Boolean(filters.q.trim() || filters.sort !== "recent");
  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);

  // Búsqueda y orden en la URL, junto a `tab=wanted` (que se conserva).
  useEffect(() => {
    writeFiltersToUrl({ q: apiFilters.q, sort: apiFilters.sort });
  }, [apiFilters]);
  const queryKey = queryKeys.myWanted(apiFilters);
  const seeded = sameFilters(filters, seededState);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError, isPending } =
    useInfiniteQuery<WantedListResponse, ApiError, WantedPages, typeof queryKey, number>({
      queryKey,
      queryFn: ({ pageParam }) => getMyWantedEntries({ page: pageParam, pageSize: PAGE_SIZE, ...apiFilters }),
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
  // La cifra de la pestaña Busco (sin filtros).
  useReportCollectionTotal("wanted", data?.pages[0]?.total ?? initial.total);

  const handleRemove = async (entry: WantedEntry) => {
    const snapshot = queryClient.getQueryData<WantedPages>(queryKey);
    setBusyId(entry.id);
    setActionError(false);
    setErrorId(null);
    queryClient.setQueryData<WantedPages>(queryKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page, index) => ({
              ...page,
              entries: page.entries.filter((item) => item.id !== entry.id),
              total: index === 0 ? Math.max(0, page.total - 1) : page.total,
            })),
          }
        : old,
    );
    try {
      await removeWantedEntry(entry.id);
      setAnnounce(t("wantedRemovedAnnouncement", { title: entry.album.title || t("albumUnavailable") }));
      setUndo({ entry, undoing: false, failed: false });
    } catch (error) {
      const gone = error instanceof ApiError && error.code === "WANTED_ENTRY_NOT_FOUND";
      if (!gone && snapshot) {
        queryClient.setQueryData(queryKey, snapshot);
        setErrorId(entry.id);
      }
    } finally {
      setBusyId(null);
      void queryClient.invalidateQueries({ queryKey: ["collection", "wanted", "mine"], exact: false });
    }
  };

  const clearUndo = useCallback(() => setUndo(null), []);

  // Deshacer vuelve a crear la variante con los mismos datos (entrada nueva: su fecha de alta cambia). Los atributos
  // que no aplican al formato quedan fuera: el servidor rechazaría la variante heredada incoherente.
  const handleUndo = async () => {
    if (!undo || undo.undoing) return;
    const { entry } = undo;
    setUndo({ ...undo, undoing: true });
    try {
      await addWantedEntries({
        releaseGroupId: entry.album.id,
        entries: [
          {
            format: entry.format,
            attributes: compatibleAttributes(entry.format, entry.attributes),
            note: entry.note,
          },
        ],
        audience: entry.audience,
      });
      setUndo(null);
      setAnnounce(t("wantedRestoredAnnouncement", { title: entry.album.title || t("albumUnavailable") }));
    } catch {
      setUndo({ entry, undoing: false, failed: true });
    } finally {
      void queryClient.invalidateQueries({ queryKey: ["collection", "wanted", "mine"], exact: false });
    }
  };

  const patchLocal = (entryId: string, mutate: (entry: WantedEntry) => WantedEntry) => {
    queryClient.setQueryData<WantedPages>(queryKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              entries: page.entries.map((item) => (item.id === entryId ? mutate(item) : item)),
            })),
          }
        : old,
    );
  };

  const startEdit = (entry: WantedEntry) => {
    setEditingId(entry.id);
    setEditDraft(wantedEntryToFormValue(entry));
    setActionError(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const handleSaveEdit = async (entry: WantedEntry) => {
    if (!editDraft) return;
    const snapshot = queryClient.getQueryData<WantedPages>(queryKey);
    const note = editDraft.note.trim() === "" ? null : editDraft.note.trim();
    setBusyId(entry.id);
    setActionError(false);
    const audience = editDraft.audience ?? entry.audience;
    patchLocal(entry.id, (item) => ({
      ...item,
      format: editDraft.format,
      attributes: editDraft.attributes,
      note,
      audience,
    }));
    try {
      await updateWantedEntry(entry.id, { format: editDraft.format, attributes: editDraft.attributes, note, audience });
      cancelEdit();
    } catch {
      if (snapshot) queryClient.setQueryData(queryKey, snapshot);
      setActionError(true);
    } finally {
      setBusyId(null);
      void queryClient.invalidateQueries({ queryKey: ["collection", "wanted", "mine"], exact: false });
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({ q: "", sort: "recent" });
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          autoComplete="off"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="h-10 min-w-0 flex-1 basis-56 rounded-md border border-ink-border bg-ink-surface px-3.5 font-data text-sm text-paper placeholder:text-paper-muted [@media(pointer:coarse)]:h-11"
        />
        <ToolbarSelect
          label={t("sortLabel")}
          value={filters.sort}
          onChange={(value) => setFilters((current) => ({ ...current, sort: value as WantedSort }))}
        >
          <option value="recent">{t("sort.recent")}</option>
          <option value="alpha">{t("sort.alpha")}</option>
        </ToolbarSelect>
        {isFiltered ? (
          <button
            type="button"
            onClick={clearFilters}
            className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper [@media(pointer:coarse)]:min-h-11"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>

      {entries.length === 0 && !isPending ? (
        isFiltered ? (
          <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
        ) : (
          <EmptyState
            title={t("wantedEmptyTitle")}
            description={t("wantedEmptyDescription")}
            action={
              <Link
                href="/search"
                className="rounded-md border border-ink-border bg-ink-surface px-4 py-2 font-data text-sm text-paper transition-colors hover:border-amber"
              >
                {t("emptyCta")}
              </Link>
            }
          />
        )
      ) : (
        <ul className="flex flex-col gap-4">
          {entries.map((entry, index) => (
            <li
              key={entry.id}
              className="flex flex-wrap gap-3 rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors focus-within:border-amber hover:border-amber"
            >
              <Link
                href={albumHref(entry.album.artistName, entry.album.title, entry.album.id)}
                tabIndex={-1}
                aria-hidden
                className="shrink-0 self-start"
              >
                <CoverThumb
                  cover={entry.album.coverThumbUrl}
                  label=""
                  className="size-16"
                  priority={index < PRIORITY_COVERS}
                />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    href={albumHref(entry.album.artistName, entry.album.title, entry.album.id)}
                    className="font-display text-base text-paper transition-colors hover:text-amber"
                  >
                    {entry.album.title || t("albumUnavailable")}
                  </Link>
                  {entry.album.artistName ? (
                    entry.album.artistId ? (
                      <Link
                        href={artistHref(entry.album.artistName ?? "", entry.album.artistId)}
                        className="font-data text-sm text-paper-muted transition-colors hover:text-paper"
                      >
                        {entry.album.artistName}
                      </Link>
                    ) : (
                      <span className="font-data text-sm text-paper-muted">{entry.album.artistName}</span>
                    )
                  ) : null}
                </div>

                {editingId === entry.id && editDraft ? (
                  <div className="flex flex-col gap-3 rounded border border-ink-border bg-ink p-3">
                    <WantedVariantForm
                      value={editDraft}
                      onChange={setEditDraft}
                      showAudience
                      disabled={busyId === entry.id}
                      savedAttributes={entry.attributes}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        disabled={busyId === entry.id}
                        onClick={() => void handleSaveEdit(entry)}
                      >
                        {busyId === entry.id ? t("saving") : t("saveEdit")}
                      </Button>
                      <Button variant="ghost" disabled={busyId === entry.id} onClick={cancelEdit}>
                        {t("cancelEdit")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-1.5 font-data text-xs">
                      {/* "Cualquier formato" no es un dato de la variante: va como texto secundario, sin caja. */}
                      {entry.format ? (
                        <span className="rounded border border-ink-border px-1.5 py-0.5 text-paper">
                          {t(`format.${entry.format}`)}
                        </span>
                      ) : (
                        <span className="text-paper-muted">{t("anyFormat")}</span>
                      )}
                      {entry.attributes.map((attribute) => (
                        <span
                          key={attribute}
                          className="rounded border border-ink-border px-1.5 py-0.5 text-paper-muted"
                        >
                          {t(`attribute.${attribute}`)}
                        </span>
                      ))}
                    </div>
                    {entry.note ? <p className="font-body text-sm text-paper-muted">{entry.note}</p> : null}
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <time dateTime={entry.createdAt} className="font-data text-xs text-paper-muted">
                        {formatCollectionDate(entry.createdAt, locale)}
                        {` · ${t(`audience.${entry.audience}`)}`}
                      </time>
                      <span className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={busyId === entry.id}
                          onClick={() => startEdit(entry)}
                          className={`${ROW_ACTION} hover:text-paper`}
                        >
                          {t("editEntry")}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === entry.id}
                          onClick={() => void handleRemove(entry)}
                          className={`${ROW_ACTION} hover:text-danger`}
                        >
                          {t("remove")}
                        </button>
                      </span>
                    </div>
                    {errorId === entry.id ? (
                      <span role="alert" className="font-data text-xs text-danger">
                        {t("removeError")}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
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

      {undo ? (
        <UndoToast
          key={undo.entry.id}
          message={
            undo.failed
              ? t("undoError")
              : t("wantedRemovedToast", { title: undo.entry.album.title || t("albumUnavailable") })
          }
          undoLabel={t("undo")}
          onUndo={undo.failed ? undefined : () => void handleUndo()}
          onExpire={clearUndo}
          undoing={undo.undoing}
        />
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
