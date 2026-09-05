"use client";

import { keepPreviousData, useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { RelativeDate, TargetTitle } from "@/components/feed/feed-row-parts";
import { targetHref } from "@/components/feed/feed-target";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListenEntryForm } from "./ListenEntryForm";
import { ReactionBadge } from "./ReactionBadge";
import { deleteListenEntry, getMyDiary, type DiaryFiltersParams } from "@/lib/api/diary";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type {
  DiaryAudience,
  DiaryListResponse,
  ListenContext,
  ListenEntry,
  ListenReaction,
} from "@/lib/api/schemas";

const PAGE_SIZE = 20;

interface DiaryActivityListProps {
  initial: DiaryListResponse;
  empty?: { title: string; description: string };
}

// Presentación en fila del diario propio: la misma anatomía que /me/feed (celda
// de carátula/disco, título como ancla, fecha relativa) — no la variante compacta
// "self" sin celda, pensada para un aside dentro de Inicio, no para la página
// dedicada. Editable, a diferencia de `FeedActivityList`, que es de solo lectura
// en sus tres superficies. Cada entrada es siempre su propia fila: nunca se
// agrupan escuchas, porque acá hay que poder editar o borrar una entrada puntual
// (ver openspec/changes/redesign-diary, design.md decisiones 1 y 2).
function coverForEntry(entry: ListenEntry): string | null {
  return entry.target.type === "release-group" ? entry.target.coverThumbUrl : null;
}

// Filtro compacto: el buscador es la herramienta principal de la barra, así que
// estos tres quedan deliberadamente más livianos — sin caja ni fondo propio, mono
// chico y apagado, apenas una regla inferior. `appearance-none` saca el cromo
// nativo del `<select>` (en Chrome/Windows dejaba un parche blanco al pasar el
// mouse, ajeno a la paleta) y dibujamos nuestra propia flecha para no perder la
// afordancia de "esto despliega opciones".
function FilterSelect({
  value,
  onChange,
  ariaLabel,
  widthClassName,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  widthClassName: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className={`diary-filter-select appearance-none rounded border-b border-ink-border bg-transparent py-1.5 pl-0.5 pr-4 font-data text-sm text-paper-muted transition-colors hover:text-paper ${widthClassName}`}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute right-0 top-1/2 size-3 -translate-y-1/2 text-paper-muted"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

// La impresión escrita como cita, no como card: sin fondo ni caja bordeada — una
// regla neutra a la izquierda (el mismo `ink-border` que separa todo en este
// sistema, nunca un color nuevo) y el texto indentado, en Source Serif cursiva
// con comillas tipográficas. Es lo que distingue "tu voz" de un panel de UI más.
// `border-l-2` (no el hairline de 1px que usan cards y divisores): acá la regla
// no separa dos bloques, tiene que leerse como el marcador de una cita — con 1px
// el indent se sentía un margen accidental, no un gesto editorial deliberado.
// Tratamiento propio del diario: `ProsePanel` (con caja) sigue siendo el de
// `/me/feed`, donde una nota compite por peso con ratings y favoritos vecinos.
function ImpressionQuote({ body }: { body: string }) {
  return (
    <p className="mt-3 border-l-2 border-ink-border pl-3 font-body text-sm text-paper italic">
      “{body}”
    </p>
  );
}

// Estado de filtros de la UI: `""` es "sin filtrar" para los tres `<select>`
// (más simple que `undefined` para el valor controlado de un elemento nativo).
// `q` es el valor tal cual lo tipea el usuario, sin debounce — `useDiaryFilters`
// (más abajo) es quien lo recorta a la versión que efectivamente viaja al servidor.
interface DiaryFiltersState {
  q: string;
  context: ListenContext | "";
  reaction: ListenReaction | "none" | "";
  audience: DiaryAudience | "";
}

const EMPTY_FILTERS: DiaryFiltersState = { q: "", context: "", reaction: "", audience: "" };

function toApiFilters(filters: DiaryFiltersState): DiaryFiltersParams {
  const q = filters.q.trim();
  return {
    q: q ? q : undefined,
    context: filters.context || undefined,
    reaction: filters.reaction || undefined,
    audience: filters.audience || undefined,
  };
}

function hasActiveFilters(filters: DiaryFiltersState): boolean {
  return Boolean(filters.q.trim() || filters.context || filters.reaction || filters.audience);
}

type DiaryPages = InfiniteData<DiaryListResponse, number>;

export function DiaryActivityList({ initial, empty }: DiaryActivityListProps) {
  const t = useTranslations("diary");
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<DiaryFiltersState>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  // Confirmación de guardado: sin texto ("Guardado"), un destello ámbar que se
  // apaga solo — el cierre automático del formulario ya dice "esto se guardó";
  // el destello es el refuerzo visual para quien no estaba mirando el botón.
  // Anuncio accesible aparte (`sr-only`) para quien usa lector de pantalla.
  const [savedId, setSavedId] = useState<string | null>(null);

  // Debounce del buscador: espera a que el usuario deje de tipear antes de
  // disparar la query — evita una request por tecla.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => (current.q === searchInput ? current : { ...current, q: searchInput }));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!savedId) return;
    const timeout = window.setTimeout(() => setSavedId(null), 1500);
    return () => window.clearTimeout(timeout);
  }, [savedId]);

  const isFiltered = hasActiveFilters(filters);
  const apiFilters = toApiFilters(filters);
  const queryKey = queryKeys.myDiary(apiFilters);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isPending, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => getMyDiary(pageParam, PAGE_SIZE, apiFilters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    // La página 1 sin filtros ya vino resuelta del servidor — no tiene sentido
    // volver a pedirla apenas se monta. Con filtros activos no hay nada que
    // sembrar: cada combinación es una serie nueva.
    initialData: isFiltered ? undefined : () => ({ pages: [initial], pageParams: [1] }),
    staleTime: Infinity,
    // Al cambiar un filtro, sigue mostrando los resultados anteriores hasta que
    // llegan los nuevos en vez de vaciar la lista por un instante.
    placeholderData: keepPreviousData,
  });

  const entries = data?.pages.flatMap((page) => page.entries) ?? initial.entries;

  const updateCachedEntry = (updated: ListenEntry) => {
    queryClient.setQueryData<DiaryPages>(queryKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              entries: page.entries.map((item) => (item.id === updated.id ? updated : item)),
            })),
          }
        : old,
    );
  };

  const removeCachedEntry = (id: string) => {
    queryClient.setQueryData<DiaryPages>(queryKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              entries: page.entries.filter((item) => item.id !== id),
            })),
          }
        : old,
    );
  };

  const handleDelete = async (entry: ListenEntry) => {
    setDeletingId(entry.id);
    setActionError(false);
    try {
      await deleteListenEntry(entry.id);
      removeCachedEntry(entry.id);
      setPendingDeleteId(null);
      if (expandedId === entry.id) setExpandedId(null);
    } catch (error) {
      if (error instanceof ApiError && error.code === "LISTEN_ENTRY_NOT_FOUND") {
        removeCachedEntry(entry.id);
        setPendingDeleteId(null);
      } else {
        setActionError(true);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoadMore = () => {
    setActionError(false);
    fetchNextPage().catch(() => setActionError(true));
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
  };

  const filterBar = (
    // Fila del buscador y fila de filtros son dos bloques `flex-col` separados
    // a propósito, en vez de un único `flex-wrap`: con todo en una fila, la
    // aparición de "Limpiar filtros" (solo cuando hay un filtro activo) alcanzaba
    // a empujar el ancho total más allá del contenedor y todo el cluster de
    // filtros saltaba debajo del buscador al elegir cualquier opción. Con el
    // buscador ya siempre arriba, no hay nada de qué "saltar".
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
          value={filters.context}
          onChange={(value) => setFilters((current) => ({ ...current, context: value as ListenContext | "" }))}
          ariaLabel={t("contextLabel")}
          widthClassName="w-[19ch]"
        >
          <option value="">{t("filterAllContext")}</option>
          <option value="first_listen">{t("context.first_listen")}</option>
          <option value="relisten">{t("context.relisten")}</option>
          <option value="rediscovery">{t("context.rediscovery")}</option>
        </FilterSelect>
        <FilterSelect
          value={filters.reaction}
          onChange={(value) => setFilters((current) => ({ ...current, reaction: value as ListenReaction | "none" | "" }))}
          ariaLabel={t("reactionLabel")}
          widthClassName="w-[15ch]"
        >
          <option value="">{t("filterAllReaction")}</option>
          <option value="liked">{t("reaction.liked")}</option>
          <option value="loved">{t("reaction.loved")}</option>
          <option value="obsessed">{t("reaction.obsessed")}</option>
          <option value="neutral">{t("reaction.neutral")}</option>
          <option value="disliked">{t("reaction.disliked")}</option>
          <option value="none">{t("reaction.none")}</option>
        </FilterSelect>
        <FilterSelect
          value={filters.audience}
          onChange={(value) => setFilters((current) => ({ ...current, audience: value as DiaryAudience | "" }))}
          ariaLabel={t("audienceLabel")}
          widthClassName="w-[13ch]"
        >
          <option value="">{t("filterAllAudience")}</option>
          <option value="private">{t("audience.private")}</option>
          <option value="followers">{t("audience.followers")}</option>
          <option value="public">{t("audience.public")}</option>
        </FilterSelect>
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
      <div className="flex w-full flex-col gap-4">
        {filterBar}
        <EmptyState
          title={isFiltered ? t("noResultsTitle") : (empty?.title ?? t("emptyTitle"))}
          description={isFiltered ? t("noResultsDescription") : (empty?.description ?? t("emptyDescription"))}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {filterBar}
      <span role="status" aria-live="polite" className="sr-only">
        {savedId ? t("savedAnnouncement") : null}
      </span>
      <ul className="divide-y divide-ink-border">
        {entries.map((entry) => {
          const body = entry.body != null && entry.body.trim() !== "" ? entry.body : null;
          const expanded = expandedId === entry.id;
          const pendingDelete = pendingDeleteId === entry.id;
          const deleting = deletingId === entry.id;

          return (
            <li
              key={entry.id}
              className={`${body ? "py-4" : "py-3"} first:pt-0 last:pb-0 transition-colors duration-1000 ${
                savedId === entry.id ? "bg-amber/10" : "bg-transparent"
              }`}
            >
              <div className="flex gap-3 sm:gap-4">
                <CoverThumb cover={coverForEntry(entry)} label="" className="size-11 sm:size-12" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="flex min-w-0 items-baseline gap-1 font-data text-xs text-paper-muted">
                      <span>{t(`context.${entry.listenContext}`)}</span>
                      {entry.reaction ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <ReactionBadge reaction={entry.reaction} />
                        </>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-data text-xs text-paper-muted">
                        {t(`audience.${entry.audience}`)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <RelativeDate iso={entry.createdAt} />
                      <span aria-hidden="true">·</span>
                      <button
                        type="button"
                        className="font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
                        onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
                      >
                        {expanded ? t("collapse") : t("edit")}
                      </button>
                      {!pendingDelete && (
                        <>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            className="font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-danger"
                            onClick={() => setPendingDeleteId(entry.id)}
                          >
                            {t("delete")}
                          </button>
                        </>
                      )}
                    </span>
                  </div>
                  {pendingDelete && (
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span role="alert" className="min-w-0 font-data text-xs text-danger">
                        {deleting ? t("deleting") : t("deleteConfirm")}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          disabled={deleting}
                          className="font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => void handleDelete(entry)}
                        >
                          {t("delete")}
                        </button>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          disabled={deleting}
                          className="font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => setPendingDeleteId(null)}
                        >
                          {t("collapse")}
                        </button>
                      </span>
                    </div>
                  )}
                  <div className="mt-1">
                    <TargetTitle
                      href={targetHref(entry.target.type, entry.target.id)}
                      label={entry.target.title}
                      artist={entry.target.subtitle}
                      layout="inline"
                    />
                  </div>
                  {body ? <ImpressionQuote body={body} /> : null}
                  {expanded && (
                    <div className="mt-3">
                      <ListenEntryForm
                        entryId={entry.id}
                        initial={{
                          listenContext: entry.listenContext,
                          body: entry.body,
                          reaction: entry.reaction,
                          audience: entry.audience,
                        }}
                        onCancel={() => setExpandedId(null)}
                        onSaved={(updated) => {
                          updateCachedEntry(updated);
                          setExpandedId(null);
                          setSavedId(updated.id);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {hasNextPage && (
        <Button
          variant="secondary"
          disabled={isFetchingNextPage}
          onClick={handleLoadMore}
          className="self-center"
        >
          {isFetchingNextPage ? t("loadingMore") : t("loadMore")}
        </Button>
      )}
      {(actionError || isError) && (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      )}
    </div>
  );
}
