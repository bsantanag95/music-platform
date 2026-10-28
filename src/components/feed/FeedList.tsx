"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { FeedActivityList } from "./FeedActivityList";
import { getFeed, type FeedFiltersParams } from "@/lib/api/diary";
import { queryKeys } from "@/lib/query/keys";
import { FEED_KINDS, type AuthorSummary, type FeedEntry, type FeedResponse } from "@/lib/api/schemas";

const PAGE_SIZE = 20;

interface FeedListProps {
  initial: FeedResponse;
  authors: AuthorSummary[];
  // Filtros con los que el servidor resolvió `initial`, leídos de la URL (refine-feed-page-phase1, D2). `author` es el
  // nombre de usuario de un seguido aceptado; la página ya descartó los inválidos.
  initialFilters?: { kind: FeedEntry["kind"] | ""; author: string; q: string };
}

// Estado de filtros de la UI: `""` es "sin filtrar" para los dos `<select>`
// (más simple que `undefined` para el valor controlado de un elemento
// nativo). `author` es el nombre de usuario, que es lo que viaja en la URL. `q` es el valor tal cual lo tipea el usuario, sin debounce — el
// `useEffect` de abajo es quien lo recorta a la versión que viaja al
// servidor. Mismo patrón que `DiaryActivityList` (add-diary-filters).
interface FeedFiltersState {
  kind: FeedEntry["kind"] | "";
  author: string;
  q: string;
}

const EMPTY_FILTERS: FeedFiltersState = { kind: "", author: "", q: "" };

function toApiFilters(filters: FeedFiltersState, authors: AuthorSummary[]): FeedFiltersParams {
  const q = filters.q.trim();
  return {
    kind: filters.kind || undefined,
    authorId: authors.find((author) => author.username === filters.author)?.id,
    q: q ? q : undefined,
  };
}

function hasActiveFilters(filters: FeedFiltersState): boolean {
  return Boolean(filters.kind || filters.author || filters.q.trim());
}

function sameFilters(a: FeedFiltersState, b: FeedFiltersState): boolean {
  return a.kind === b.kind && a.author === b.author && a.q.trim() === b.q.trim();
}

// Refleja los filtros en la URL con `replaceState` (sin historial), escribiendo solo los activos — mismo criterio que
// `/me/progress` (refine-feed-page-phase1, D2).
function writeFiltersToUrl(filters: FeedFiltersState) {
  const params = new URLSearchParams(window.location.search);
  const values = { q: filters.q.trim(), kind: filters.kind, author: filters.author };
  for (const [key, value] of Object.entries(values)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ""}`;
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(window.history.state, "", next);
  }
}

// Feed de actividad: escuchas, favoritos, eventos de listas, ratings y
// comentarios de los usuarios seguidos. Cada tipo de entrada se renderiza
// según su `kind` con jerarquía visual: las entradas con texto (escucha con
// impresión, comentario) tienen más peso. A diferencia del preview de Inicio
// (sin filtros, scroll interno acotado), esta es la vista completa: búsqueda
// por texto, y filtro por tipo de actividad y por persona seguida,
// combinables — mismo patrón que `/me/diary` (ver
// openspec/changes/add-feed-filters).
export function FeedList({ initial, authors, initialFilters }: FeedListProps) {
  const t = useTranslations("feed");

  // Fijo durante la vida del componente: es la combinación que resolvió el servidor.
  const [seedFilters] = useState<FeedFiltersState>(() => ({ ...EMPTY_FILTERS, ...initialFilters }));
  const [filters, setFilters] = useState<FeedFiltersState>(seedFilters);
  const [searchInput, setSearchInput] = useState(seedFilters.q);
  const [announcement, setAnnouncement] = useState("");

  // Debounce del buscador: espera a que el usuario deje de tipear antes de
  // disparar la query — evita una request por tecla.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => (current.q === searchInput ? current : { ...current, q: searchInput }));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    writeFiltersToUrl(filters);
  }, [filters]);

  const isFiltered = hasActiveFilters(filters);
  const apiFilters = useMemo(() => toApiFilters(filters, authors), [filters, authors]);
  const queryKey = queryKeys.myFeed(apiFilters);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isPending, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => getFeed(pageParam, PAGE_SIZE, apiFilters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    // La página 1 de la combinación que pidió la URL ya vino resuelta del servidor — no tiene sentido volver a pedirla
    // apenas se monta. Cualquier otra combinación es una serie nueva, sin nada que sembrar.
    initialData: sameFilters(filters, seedFilters) ? () => ({ pages: [initial], pageParams: [1] }) : undefined,
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
        autoComplete="off"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted [@media(pointer:coarse)]:min-h-11"
      />
      <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <FilterSelect
          value={filters.kind}
          onChange={(value) => setFilters((current) => ({ ...current, kind: value as FeedEntry["kind"] | "" }))}
          ariaLabel={t("kindLabel")}
          widthClassName="w-full sm:w-[24ch]"
          variant="boxed"
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
            value={filters.author}
            onChange={(value) => setFilters((current) => ({ ...current, author: value }))}
            ariaLabel={t("authorLabel")}
            widthClassName="w-full sm:w-[24ch]"
            variant="boxed"
          >
            <option value="">{t("filterAllAuthor")}</option>
            {authors.map((author) => (
              <option key={author.id} value={author.username}>
                {author.displayName ?? `@${author.username}`}
              </option>
            ))}
          </FilterSelect>
        )}
        {isFiltered && (
          <button
            type="button"
            onClick={clearFilters}
            className="justify-self-start px-1 font-data text-xs text-paper-muted transition-colors hover:text-paper [@media(pointer:coarse)]:min-h-11"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>
    </div>
  );

  if (entries.length === 0 && !isPending) {
    // Sin filtros, dos vacíos distintos (refine-feed-page-phase1, D5): no sigue a nadie, o sigue a gente que todavía
    // no publicó nada. Sin seguidos tampoco hay barra de filtros: no hay nada que filtrar.
    if (!isFiltered && authors.length === 0) {
      return (
        <EmptyState
          title={t("emptyNoFollowsTitle")}
          description={t("emptyNoFollowsDescription")}
          action={<EmptyAction href="/users" label={t("findPeopleCta")} />}
        />
      );
    }
    return (
      <div className="flex w-full flex-col gap-4">
        {filterBar}
        <EmptyState
          title={isFiltered ? t("noResultsTitle") : t("emptyQuietTitle")}
          description={isFiltered ? t("noResultsDescription") : t("emptyQuietDescription")}
          action={isFiltered ? undefined : <EmptyAction href="/activity" label={t("communityCta")} />}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {filterBar}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
      {/* Bloques de fecha y reseña como tarjeta, igual que `/activity` (refine-feed-page-phase1, D3). */}
      <FeedActivityList entries={entries} clamp dateSections reviewCard />
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

function EmptyAction({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-ink-border px-3 py-2 font-data text-sm text-paper transition-colors hover:border-amber"
    >
      {label}
    </Link>
  );
}
