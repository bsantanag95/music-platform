"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { FeedActivityList } from "./FeedActivityList";
import { getFeed, type FeedFiltersParams } from "@/lib/api/diary";
import { queryKeys } from "@/lib/query/keys";
import type { AuthorSummary, FeedEntry, FeedResponse } from "@/lib/api/schemas";

const PAGE_SIZE = 20;
const FEED_KINDS = ["listen", "favorite", "list", "rating", "comment"] as const;

interface FeedListProps {
  initial: FeedResponse;
  authors: AuthorSummary[];
  empty?: { title: string; description: string };
}

// Estado de filtros de la UI: `""` es "sin filtrar" para los dos `<select>`
// (más simple que `undefined` para el valor controlado de un elemento
// nativo). `q` es el valor tal cual lo tipea el usuario, sin debounce — el
// `useEffect` de abajo es quien lo recorta a la versión que viaja al
// servidor. Mismo patrón que `DiaryActivityList` (add-diary-filters).
interface FeedFiltersState {
  kind: FeedEntry["kind"] | "";
  authorId: string;
  q: string;
}

const EMPTY_FILTERS: FeedFiltersState = { kind: "", authorId: "", q: "" };

function toApiFilters(filters: FeedFiltersState): FeedFiltersParams {
  const q = filters.q.trim();
  return {
    kind: filters.kind || undefined,
    authorId: filters.authorId || undefined,
    q: q ? q : undefined,
  };
}

function hasActiveFilters(filters: FeedFiltersState): boolean {
  return Boolean(filters.kind || filters.authorId || filters.q.trim());
}

// Feed de actividad: escuchas, favoritos, eventos de listas, ratings y
// comentarios de los usuarios seguidos. Cada tipo de entrada se renderiza
// según su `kind` con jerarquía visual: las entradas con texto (escucha con
// impresión, comentario) tienen más peso. A diferencia del preview de Inicio
// (sin filtros, scroll interno acotado), esta es la vista completa: búsqueda
// por texto, y filtro por tipo de actividad y por persona seguida,
// combinables — mismo patrón que `/me/diary` (ver
// openspec/changes/add-feed-filters).
export function FeedList({ initial, authors, empty }: FeedListProps) {
  const t = useTranslations("feed");

  const [filters, setFilters] = useState<FeedFiltersState>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [announcement, setAnnouncement] = useState("");

  // Debounce del buscador: espera a que el usuario deje de tipear antes de
  // disparar la query — evita una request por tecla.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => (current.q === searchInput ? current : { ...current, q: searchInput }));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const isFiltered = hasActiveFilters(filters);
  const apiFilters = toApiFilters(filters);
  const queryKey = queryKeys.myFeed(apiFilters);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isPending, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => getFeed(pageParam, PAGE_SIZE, apiFilters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    // La página 1 sin filtros ya vino resuelta del servidor — no tiene sentido
    // volver a pedirla apenas se monta. Con filtros activos no hay nada que
    // sembrar: cada combinación es una serie nueva.
    initialData: isFiltered ? undefined : () => ({ pages: [initial], pageParams: [1] }),
    staleTime: Infinity,
    // Al cambiar un filtro, sigue mostrando los resultados anteriores hasta
    // que llegan los nuevos en vez de vaciar la lista por un instante.
    placeholderData: keepPreviousData,
  });

  const entries = data?.pages.flatMap((page) => page.entries) ?? initial.entries;
  const reachedEnd = !hasNextPage && entries.length > 0 && !isPending;

  const handleLoadMore = () => {
    const previousCount = entries.length;
    fetchNextPage()
      .then((result) => {
        const nextEntries = result.data?.pages.flatMap((page) => page.entries) ?? [];
        const added = nextEntries.length - previousCount;
        if (added > 0) setAnnouncement(t("loadedAnnouncement", { count: added }));
      })
      .catch(() => {
        // El error ya se refleja en `isError`; no hace falta un estado propio.
      });
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
  };

  const filterBar = (
    <div className="flex w-full flex-col gap-2">
      <input
        type="search"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <FilterSelect
          value={filters.kind}
          onChange={(value) => setFilters((current) => ({ ...current, kind: value as FeedEntry["kind"] | "" }))}
          ariaLabel={t("kindLabel")}
          widthClassName="w-[15ch]"
        >
          <option value="">{t("filterAllKind")}</option>
          {FEED_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`kind.${kind}`)}
            </option>
          ))}
        </FilterSelect>
        {authors.length > 0 && (
          <FilterSelect
            value={filters.authorId}
            onChange={(value) => setFilters((current) => ({ ...current, authorId: value }))}
            ariaLabel={t("authorLabel")}
            widthClassName="w-[17ch]"
          >
            <option value="">{t("filterAllAuthor")}</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.displayName ?? `@${author.username}`}
              </option>
            ))}
          </FilterSelect>
        )}
        {isFiltered && (
          <button
            type="button"
            onClick={clearFilters}
            className="font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>
    </div>
  );

  if (entries.length === 0 && !isPending) {
    return (
      <div className="flex w-full max-w-2xl flex-col gap-4">
        {filterBar}
        <EmptyState
          title={isFiltered ? t("noResultsTitle") : (empty?.title ?? t("emptyTitle"))}
          description={isFiltered ? t("noResultsDescription") : (empty?.description ?? t("emptyDescription"))}
          action={
            isFiltered ? undefined : (
              <Link
                href="/users"
                className="rounded-md border border-ink-border px-3 py-2 font-data text-sm text-paper transition-colors hover:border-amber"
              >
                {t("findPeopleCta")}
              </Link>
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {filterBar}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <FeedActivityList entries={entries} clamp />
      {isError && (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      )}
      {hasNextPage && (
        <Button
          variant="secondary"
          disabled={isFetchingNextPage}
          onClick={handleLoadMore}
          className="self-center"
        >
          {isFetchingNextPage ? t("loadingMore") : isError ? t("retry") : t("loadMore")}
        </Button>
      )}
      {reachedEnd && !isFiltered && (
        <p className="text-center font-data text-xs text-paper-muted">{t("caughtUpMessage")}</p>
      )}
    </div>
  );
}
