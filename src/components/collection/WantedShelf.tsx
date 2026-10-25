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
import { addCollectionEntry, removeCollectionEntry } from "@/lib/api/collection";
import { UndoToast } from "@/components/ui/UndoToast";
import { compatibleAttributes, type CollectionFormat } from "@/services/collection/vocabulary";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import { albumHref, artistHref } from "@/lib/catalog-links";
import { ToolbarSelect } from "./ToolbarSelect";
import { useAdjustCollectionTotal, useReportCollectionTotal } from "./CollectionTabs";
import { PRIORITY_COVERS, formatCollectionDate, writeFiltersToUrl } from "./collection-shared";
import { EntryMenu } from "./EntryMenu";
import { EditionSummary, RemoveError } from "./entry-parts";
import { GotItButton } from "./GotItButton";
import { WantedEditSheet } from "./WantedEditSheet";
import type { WantedVariantFormValue } from "./WantedVariantForm";
import type { DiaryAudience, WantedEntry, WantedListResponse, WantedSort } from "@/lib/api/schemas";

const PAGE_SIZE = 20;

type WantedPages = InfiniteData<WantedListResponse, number>;

/**
 * Lo que el aviso ofrece deshacer: una variante quitada (vuelve a crearse) o una conseguida (se quita la copia creada
 * en Tengo y vuelve la variante).
 */
type UndoState =
  | { kind: "removed"; entry: WantedEntry; undoing: boolean; failed: boolean }
  | { kind: "gotIt"; entry: WantedEntry; copyId: string; undoing: boolean; failed: boolean };

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

/** Datos para volver a crear una variante quitada o conseguida. */
function restoreRequest(entry: WantedEntry) {
  return {
    releaseGroupId: entry.album.id,
    entries: [
      {
        format: entry.format,
        attributes: compatibleAttributes(entry.format, entry.attributes),
        note: entry.note,
      },
    ],
    audience: entry.audience,
  };
}

// Pestaña "Busco" de /me/collection (openspec: redesign-collection-views): filas compactas como la Lista detallada de
// Tengo, con "Buscas: …", "Ya tienes: …" cuando el álbum ya está en Tengo, "Lo conseguí" y el mismo menú `⋯` y la misma
// hoja de edición que Tengo. Sin los modos de visualización ni la selección en lote de Tengo (add-collection-wishlist,
// D5).
export function WantedShelf({ initial, initialFilters }: WantedShelfProps) {
  const t = useTranslations("collection");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const adjustTotal = useAdjustCollectionTotal();

  const seededState = useMemo(() => toFiltersState(initialFilters), [initialFilters]);
  const [filters, setFilters] = useState<WantedFiltersState>(seededState);
  const [searchInput, setSearchInput] = useState(seededState.q);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [editing, setEditing] = useState<WantedEntry | null>(null);
  const [editError, setEditError] = useState(false);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [gotItErrorId, setGotItErrorId] = useState<string | null>(null);
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

  const invalidateWanted = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["collection", "wanted", "mine"], exact: false }),
    [queryClient],
  );

  /** Saca una entrada de la lista (y descuenta el total) sin esperar a la API. */
  const patchRemove = (entryId: string) => {
    queryClient.setQueryData<WantedPages>(queryKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page, index) => ({
              ...page,
              entries: page.entries.filter((item) => item.id !== entryId),
              total: index === 0 ? Math.max(0, page.total - 1) : page.total,
            })),
          }
        : old,
    );
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

  const handleRemove = async (entry: WantedEntry) => {
    const snapshot = queryClient.getQueryData<WantedPages>(queryKey);
    setBusyId(entry.id);
    setActionError(false);
    setErrorId(null);
    patchRemove(entry.id);
    try {
      await removeWantedEntry(entry.id);
      setAnnounce(t("wantedRemovedAnnouncement", { title: entry.album.title || t("albumUnavailable") }));
      setUndo({ kind: "removed", entry, undoing: false, failed: false });
    } catch (error) {
      const gone = error instanceof ApiError && error.code === "WANTED_ENTRY_NOT_FOUND";
      if (!gone && snapshot) {
        queryClient.setQueryData(queryKey, snapshot);
        setErrorId(entry.id);
      }
    } finally {
      setBusyId(null);
      void invalidateWanted();
    }
  };

  // "Lo conseguí" (D6): crea la copia en Tengo y quita la variante. Si quitar la variante falla, se borra la copia
  // recién creada para no dejar las dos. La audiencia de la copia es la por defecto de la colección.
  const handleGotIt = async (entry: WantedEntry, format: CollectionFormat) => {
    const snapshot = queryClient.getQueryData<WantedPages>(queryKey);
    setBusyId(entry.id);
    setGotItErrorId(null);
    let copyId: string;
    try {
      const copy = await addCollectionEntry({
        releaseGroupId: entry.album.id,
        format,
        attributes: compatibleAttributes(format, entry.attributes),
        note: entry.note,
      });
      copyId = copy.id;
    } catch {
      setGotItErrorId(entry.id);
      setBusyId(null);
      return;
    }
    patchRemove(entry.id);
    try {
      await removeWantedEntry(entry.id);
      adjustTotal("own", 1);
      setAnnounce(t("gotItAnnouncement", { title: entry.album.title || t("albumUnavailable") }));
      setUndo({ kind: "gotIt", entry, copyId, undoing: false, failed: false });
    } catch (error) {
      const gone = error instanceof ApiError && error.code === "WANTED_ENTRY_NOT_FOUND";
      if (gone) {
        adjustTotal("own", 1);
      } else {
        if (snapshot) queryClient.setQueryData(queryKey, snapshot);
        await removeCollectionEntry(copyId).catch(() => undefined);
        setGotItErrorId(entry.id);
      }
    } finally {
      setBusyId(null);
      void invalidateWanted();
      void queryClient.invalidateQueries({ queryKey: ["collection", "mine"], exact: false });
    }
  };

  const clearUndo = useCallback(() => setUndo(null), []);

  // Deshacer: una variante quitada se vuelve a crear con los mismos datos (entrada nueva: su fecha de alta cambia);
  // una conseguida además quita la copia que se había creado en Tengo.
  const handleUndo = async () => {
    if (!undo || undo.undoing) return;
    setUndo({ ...undo, undoing: true });
    try {
      if (undo.kind === "gotIt") {
        await removeCollectionEntry(undo.copyId).catch((error: unknown) => {
          if (!(error instanceof ApiError && error.code === "COLLECTION_ENTRY_NOT_FOUND")) throw error;
        });
        adjustTotal("own", -1);
      }
      await addWantedEntries(restoreRequest(undo.entry));
      setUndo(null);
      setAnnounce(t("wantedRestoredAnnouncement", { title: undo.entry.album.title || t("albumUnavailable") }));
    } catch {
      setUndo({ ...undo, undoing: false, failed: true });
    } finally {
      void invalidateWanted();
      void queryClient.invalidateQueries({ queryKey: ["collection", "mine"], exact: false });
    }
  };

  const handleAudienceChange = async (entry: WantedEntry, audience: DiaryAudience) => {
    const snapshot = queryClient.getQueryData<WantedPages>(queryKey);
    setBusyId(entry.id);
    setActionError(false);
    patchLocal(entry.id, (item) => ({ ...item, audience }));
    try {
      await updateWantedEntry(entry.id, { audience });
    } catch {
      if (snapshot) queryClient.setQueryData(queryKey, snapshot);
      setActionError(true);
    } finally {
      setBusyId(null);
      void invalidateWanted();
    }
  };

  const handleSaveEdit = async (entry: WantedEntry, value: WantedVariantFormValue) => {
    const snapshot = queryClient.getQueryData<WantedPages>(queryKey);
    const note = value.note.trim() === "" ? null : value.note.trim();
    const audience = value.audience ?? entry.audience;
    setBusyId(entry.id);
    setEditError(false);
    patchLocal(entry.id, (item) => ({ ...item, format: value.format, attributes: value.attributes, note, audience }));
    try {
      await updateWantedEntry(entry.id, { format: value.format, attributes: value.attributes, note, audience });
      setEditing(null);
    } catch {
      if (snapshot) queryClient.setQueryData(queryKey, snapshot);
      setEditError(true);
    } finally {
      setBusyId(null);
      void invalidateWanted();
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters({ q: "", sort: "recent" });
  };

  const undoMessage = (state: UndoState) => {
    if (state.failed) return t("undoError");
    const title = state.entry.album.title || t("albumUnavailable");
    return state.kind === "gotIt" ? t("gotItToast", { title }) : t("wantedRemovedToast", { title });
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
        <ul className="flex flex-col divide-y divide-ink-border border-y border-ink-border">
          {entries.map((entry, index) => {
            const title = entry.album.title || t("albumUnavailable");
            const href = albumHref(entry.album.artistName, entry.album.title, entry.album.id);
            const busy = busyId === entry.id;
            const owned = entry.owned ?? [];
            return (
              <li key={entry.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3 sm:flex-nowrap">
                <Link href={href} tabIndex={-1} aria-hidden className="shrink-0 overflow-hidden rounded">
                  <CoverThumb
                    cover={entry.album.coverThumbUrl}
                    label=""
                    className="size-12"
                    priority={index < PRIORITY_COVERS}
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <Link href={href} className="font-display text-base text-paper transition-colors hover:text-amber">
                      {title}
                    </Link>
                    {entry.album.artistName ? (
                      entry.album.artistId ? (
                        <Link
                          href={artistHref(entry.album.artistName ?? "", entry.album.artistId)}
                          className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
                        >
                          {entry.album.artistName}
                        </Link>
                      ) : (
                        <span className="font-data text-xs text-paper-muted">{entry.album.artistName}</span>
                      )
                    ) : null}
                    {entry.album.year ? (
                      <span className="font-data text-xs text-paper-muted">{entry.album.year}</span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 font-data text-[0.7rem]">
                    <span className="text-paper-muted">{t("lookingFor")}</span>
                    {/* "Cualquier formato" no es un dato de la variante: va como texto secundario, sin caja. */}
                    {entry.format ? (
                      <span className="rounded border border-ink-border px-1.5 py-0.5 text-paper">
                        {t(`format.${entry.format}`)}
                      </span>
                    ) : (
                      <span className="text-paper-muted">{t("anyFormat")}</span>
                    )}
                    {entry.attributes.map((attribute) => (
                      <span key={attribute} className="rounded border border-ink-border px-1.5 py-0.5 text-paper-muted">
                        {t(`attribute.${attribute}`)}
                      </span>
                    ))}
                    {owned[0] ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-petrol/50 px-2 py-0.5 text-petrol-hover">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="size-3">
                          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                        </svg>
                        {t("alreadyHave")} <EditionSummary format={owned[0].format} attributes={owned[0].attributes} />
                        {owned.length > 1 ? ` (+${owned.length - 1})` : null}
                      </span>
                    ) : null}
                  </div>

                  {entry.note ? <p className="font-body text-sm italic text-paper-muted">{entry.note}</p> : null}
                  {errorId === entry.id ? <RemoveError /> : null}
                  {gotItErrorId === entry.id ? (
                    <span role="alert" className="font-data text-xs text-danger">
                      {t("gotItError")}
                    </span>
                  ) : null}
                </div>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <time dateTime={entry.createdAt} className="font-data text-[0.7rem] text-paper-muted">
                    {formatCollectionDate(entry.createdAt, locale)}
                  </time>
                  <GotItButton format={entry.format} busy={busy} onGotIt={(format) => void handleGotIt(entry, format)} />
                  <EntryMenu
                    title={title}
                    audience={entry.audience}
                    busy={busy}
                    showBadge
                    onEdit={() => {
                      setEditError(false);
                      setEditing(entry);
                    }}
                    onAudienceChange={(audience) => void handleAudienceChange(entry, audience)}
                    onRemove={() => void handleRemove(entry)}
                  />
                </div>
              </li>
            );
          })}
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
          key={`${undo.kind}-${undo.entry.id}`}
          message={undoMessage(undo)}
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

      {editing ? (
        <WantedEditSheet
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
    </div>
  );
}
