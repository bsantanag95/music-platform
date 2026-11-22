"use client";

import { useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { getDiscoverLists, getListsFromFollowing, getPopularLists, type DiscoverListFiltersParams } from "@/lib/api/lists";
import { queryKeys } from "@/lib/query/keys";
import type { DiscoverListsResponse, UserListItem } from "@/lib/api/schemas";
import type { CaminoDiscoverySummary } from "@/services/camino/discovery";
import { ListPreview } from "./ListPreview";
import { ListRow, READER_PREVIEW_QUERY } from "./ListRow";
import { toDiscoverFilters, type CommunityListFilters } from "./community-filters";
import { entryFromCamino, entryFromList, type ReaderEntry } from "./reader-entries";

const PAGE_SIZE = 20;

export type ListsTabSource = "from-following" | "popular" | "recent";

const SOURCES = {
  popular: { fetch: getPopularLists, queryKey: queryKeys.popularLists() },
  "from-following": { fetch: getListsFromFollowing, queryKey: queryKeys.listsFromFollowing() },
  recent: { fetch: getDiscoverLists, queryKey: queryKeys.discoverLists() },
} as const;

/** Una pestaña del lector: listas de la comunidad paginadas, o "Para completar". */
export type ReaderTab =
  | { key: ListsTabSource; label: string; initial: DiscoverListsResponse; excludeIds: string[] }
  | { key: "to-complete"; label: string; caminos: CaminoDiscoverySummary[]; seeAll: { href: string; label: string } };

/** Vista previa resuelta en el servidor: la primera lista de la primera pestaña. */
export interface InitialPreview {
  id: string;
  items: UserListItem[];
}

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(READER_PREVIEW_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Si la vista previa está a la vista (desde `lg`). En el servidor, `false`: no se pide nada hasta hidratar. */
function useDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(READER_PREVIEW_QUERY).matches,
    () => false,
  );
}

function defaultEntry(tab: ReaderTab, locale: string, canSave: boolean): ReaderEntry | null {
  if (tab.key === "to-complete") return tab.caminos[0] ? entryFromCamino(tab.caminos[0]) : null;
  const excluded = new Set(tab.excludeIds);
  const first = tab.initial.lists.find((list) => !excluded.has(list.id));
  return first ? entryFromList(first, locale, canSave) : null;
}

/**
 * Lector de `/lists` (openspec: redesign-lists-phase2): pestañas con las filas de cada fuente y, desde `lg`, la vista previa de
 * la lista elegida a la derecha. En el modo explorar (con filtros) es el mismo lector con una sola lista de resultados, sin
 * pestañas. La primera página de cada fuente llega del servidor; "Ver más" pide las siguientes.
 */
export function ListsReader(
  props:
    | { mode: "showcase"; tabs: ReaderTab[]; tabsLabel: string; canSave: boolean; initialPreview: InitialPreview | null }
    | {
        mode: "explore";
        initial: DiscoverListsResponse;
        filters: CommunityListFilters;
        canSave: boolean;
        initialPreview: InitialPreview | null;
      },
) {
  const locale = useLocale();
  const desktop = useDesktop();
  const firstEntry =
    props.mode === "showcase"
      ? props.tabs[0]
        ? defaultEntry(props.tabs[0], locale, props.canSave)
        : null
      : props.initial.lists[0]
        ? entryFromList(props.initial.lists[0], locale, props.canSave)
        : null;
  const [selected, setSelected] = useState<ReaderEntry | null>(firstEntry);

  // La fila elegida solo se marca con la vista previa a la vista: en el teléfono no hay nada elegido.
  const markedId = desktop ? (selected?.id ?? null) : null;

  const preview = selected ? (
    <ListPreview
      entry={selected}
      enabled={desktop}
      initialItems={props.initialPreview?.id === selected.id ? props.initialPreview.items : undefined}
    />
  ) : null;

  const body =
    props.mode === "showcase" ? (
      <ShowcaseTabs
        tabs={props.tabs}
        label={props.tabsLabel}
        canSave={props.canSave}
        selectedId={markedId}
        onSelect={setSelected}
        onTabChange={(tab) => setSelected(defaultEntry(tab, locale, props.canSave))}
      />
    ) : (
      <ExploreResults
        initial={props.initial}
        filters={props.filters}
        canSave={props.canSave}
        selectedId={markedId}
        onSelect={setSelected}
      />
    );

  return (
    <div className="grid w-full grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-12">
      <div className="min-w-0">{body}</div>
      {preview ? <div className="hidden lg:sticky lg:top-24 lg:block">{preview}</div> : null}
    </div>
  );
}

function ShowcaseTabs({
  tabs,
  label,
  canSave,
  selectedId,
  onSelect,
  onTabChange,
}: {
  tabs: ReaderTab[];
  label: string;
  canSave: boolean;
  selectedId: string | null;
  onSelect: (entry: ReaderEntry) => void;
  onTabChange: (tab: ReaderTab) => void;
}) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number, focus: boolean) => {
    setActive(index);
    onTabChange(tabs[index]!);
    if (focus) refs.current[index]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = tabs.length - 1;
    const next =
      event.key === "ArrowRight" ? (active === last ? 0 : active + 1)
      : event.key === "ArrowLeft" ? (active === 0 ? last : active - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    select(next, true);
  };

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto border-b border-ink-border px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.key}`}
            aria-selected={index === active}
            aria-controls={`${baseId}-panel-${tab.key}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => select(index, false)}
            onKeyDown={onKeyDown}
            className={`h-11 shrink-0 whitespace-nowrap px-3 font-display text-[0.9375rem] transition-colors ${
              index === active ? "text-paper shadow-[inset_0_-2px_0_var(--color-amber)]" : "text-paper-muted hover:text-paper"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`${baseId}-panel-${tab.key}`}
          aria-labelledby={`${baseId}-tab-${tab.key}`}
          hidden={index !== active}
          className="pt-2"
        >
          {tab.key === "to-complete" ? (
            <CaminoPanel tab={tab} selectedId={selectedId} onSelect={onSelect} />
          ) : (
            <ListsPanel tab={tab} canSave={canSave} selectedId={selectedId} onSelect={onSelect} />
          )}
        </div>
      ))}
    </div>
  );
}

function ListsPanel({
  tab,
  canSave,
  selectedId,
  onSelect,
}: {
  tab: Extract<ReaderTab, { initial: DiscoverListsResponse }>;
  canSave: boolean;
  selectedId: string | null;
  onSelect: (entry: ReaderEntry) => void;
}) {
  const t = useTranslations("lists");
  const locale = useLocale();
  const { fetch, queryKey } = SOURCES[tab.key];
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetch(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    initialData: { pages: [tab.initial], pageParams: [1] },
    staleTime: 30_000,
  });
  const excluded = new Set(tab.excludeIds);
  const entries = data.pages
    .flatMap((page) => page.lists)
    .filter((list) => !excluded.has(list.id))
    .map((list) => entryFromList(list, locale, canSave));

  return (
    <>
      <ul className="flex flex-col">
        {entries.map((entry) => (
          <ListRow key={entry.id} entry={entry} selected={entry.id === selectedId} onSelect={onSelect} />
        ))}
      </ul>
      {isError ? (
        <p role="alert" className="mt-3 text-center font-data text-xs text-danger">
          {t("loadError")}
        </p>
      ) : null}
      {hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            {isFetchingNextPage ? t("loadingMore") : t("loadMore")}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function CaminoPanel({
  tab,
  selectedId,
  onSelect,
}: {
  tab: Extract<ReaderTab, { key: "to-complete" }>;
  selectedId: string | null;
  onSelect: (entry: ReaderEntry) => void;
}) {
  return (
    <>
      <ul className="flex flex-col">
        {tab.caminos.map((camino) => {
          const entry = entryFromCamino(camino);
          return <ListRow key={entry.id} entry={entry} selected={entry.id === selectedId} onSelect={onSelect} />;
        })}
      </ul>
      <div className="mt-4 flex justify-center">
        <Link href={tab.seeAll.href} className="inline-flex min-h-11 items-center font-data text-sm text-paper-muted transition-colors hover:text-amber">
          {tab.seeAll.label} →
        </Link>
      </div>
    </>
  );
}

function ExploreResults({
  initial,
  filters,
  canSave,
  selectedId,
  onSelect,
}: {
  initial: DiscoverListsResponse;
  filters: CommunityListFilters;
  canSave: boolean;
  selectedId: string | null;
  onSelect: (entry: ReaderEntry) => void;
}) {
  const t = useTranslations("lists");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params: DiscoverListFiltersParams = toDiscoverFilters(filters);
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError } = useInfiniteQuery({
    queryKey: queryKeys.communityExplore(params),
    queryFn: ({ pageParam }) => getDiscoverLists(pageParam, PAGE_SIZE, params),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    initialData: { pages: [initial], pageParams: [1] },
    staleTime: 30_000,
  });
  const lists = data.pages.flatMap((page) => page.lists);
  const clear = () => router.replace(pathname, { scroll: false });

  if (lists.length === 0) {
    // Sin resultados dentro del lector (redesign-lists-phase3): limpiar todo o, con un tipo elegido, quitar solo el tipo.
    const withoutType = () => {
      const next = new URLSearchParams();
      if (filters.q) next.set("q", filters.q);
      if (filters.sort) next.set("sort", filters.sort);
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };
    return (
      <section aria-labelledby="lists-no-results" className="flex flex-col items-start gap-3 border-y border-ink-border py-10">
        <h2 id="lists-no-results" className="font-display text-2xl font-bold tracking-[-0.015em] text-paper">
          {t("community.noResultsTitle")}
        </h2>
        <p className="max-w-[52ch] font-body text-paper-muted">{t("community.noResultsDescription")}</p>
        <div className="mt-1 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={clear}>
            {t("clearFilters")}
          </Button>
          {filters.type ? (
            <Button variant="secondary" onClick={withoutType}>
              {t("community.reader.allTypes")}
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section aria-label={t("community.resultsLabel")} className="flex flex-col">
      {/* Rótulo del modo explorar (redesign-lists-page, D4): cuántas, en qué orden y cómo volver a la vitrina. Sin total en
          la respuesta: con más páginas por cargar dice "Más de N". */}
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-ink-border">
        <p role="status" aria-live="polite" className="font-data text-xs text-paper-muted">
          {hasNextPage
            ? t("community.resultsCountMore", { count: lists.length })
            : t("community.resultsCount", { count: lists.length })}
          {" · "}
          {filters.sort === "popular" ? t("community.sortPopular") : t("sort.recent")}
        </p>
        <button
          type="button"
          onClick={clear}
          className="font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
        >
          {t("clearFilters")}
        </button>
      </div>
      <ul className="flex flex-col pt-2">
        {lists.map((list) => {
          const entry = entryFromList(list, locale, canSave);
          return <ListRow key={entry.id} entry={entry} selected={entry.id === selectedId} onSelect={onSelect} />;
        })}
      </ul>
      {isError ? (
        <p role="alert" className="mt-3 text-center font-data text-xs text-danger">
          {t("loadError")}
        </p>
      ) : null}
      {hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            {isFetchingNextPage ? t("loadingMore") : t("loadMore")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
