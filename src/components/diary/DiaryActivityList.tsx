"use client";

import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { DiaryDateBlock, ProsePanel, TargetTitle, dayKey, monthKey } from "@/components/feed/feed-row-parts";
import { targetHref } from "@/components/feed/feed-target";
import { Link } from "@/i18n/navigation";
import { AddToListPanel } from "@/components/lists/AddToListPanel";
import { ListsContainingItemPanel } from "@/components/lists/ListsContainingItemPanel";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowMenu, RowMenuItem, RowMenuSeparator } from "@/components/ui/RowMenu";
import { AudienceIcon, DiaryCover } from "./diary-row-parts";
import { DiaryFilterBar } from "./DiaryFilterBar";
import {
  EMPTY_DIARY_FILTERS,
  filtersToSearchParams,
  hasActiveFilters,
  toApiFilters,
  type DiaryFiltersState,
} from "./diary-filters";
import { ListenEntryForm } from "./ListenEntryForm";
import { LogListenButton } from "./LogListenButton";
import { ReactionGlyph } from "./ReactionBadge";
import {
  createListenEntry,
  deleteListenEntry,
  getMyDiary,
  getMyDiaryMonths,
  highlightListenEntry,
  unhighlightListenEntry,
} from "@/lib/api/diary";
import { toggleWantToListen } from "@/lib/api/want-to-listen";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { DiaryListResponse, ListenEntry } from "@/lib/api/schemas";

const PAGE_SIZE = 20;

interface DiaryActivityListProps {
  initial: DiaryListResponse;
  // Filtros con los que el servidor sembró `initial`, leídos de la URL
  // (openspec: redesign-diary-page, D7). Sin ellos, el diario completo.
  initialFilters?: DiaryFiltersState;
  empty?: { title: string; description: string };
}

// Presentación en fila del diario propio (openspec: redesign-diary-row):
// carátula/disco, día deduplicado dentro de su mes, título como ancla con la
// reacción a su derecha (no en una columna fija propia — así su ausencia no
// corre el resto de la fila), y acciones como íconos: lápiz (editar, siempre
// visible) + menú "···" (Eliminar, Registrar otra escucha, Agregar a lista).
// Única vista: Cronología (agrupada por mes) — la vista de Lista plana se
// retiró tras el primer pase de este cambio, ver design.md. Editable, a
// diferencia de `FeedActivityList`, que es de solo lectura en sus tres
// superficies. Cada entrada es siempre su propia fila: nunca se agrupan
// escuchas, porque acá hay que poder editar o borrar una entrada puntual (ver
// openspec/changes/archive/redesign-diary, design.md decisiones 1 y 2).
//
// Anatomía actual (openspec: redesign-diary-page, D3): una grilla fija de cuatro
// columnas que nunca se parte — fecha (día y día de la semana), carátula según el
// tipo de objetivo, cuerpo (título con la reacción al lado y, debajo, «Artista ·
// Tipo · Contexto») y acciones (audiencia como ícono, lápiz y «···»), de 44px en
// móvil. Fechas y meses en la zona horaria del usuario (`useTimeZone()`, D1).

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

// Flecha de colapsar/expandir por mes (openspec: add-diary-date-navigation):
// apunta hacia abajo expandida, hacia la derecha colapsada — mismo lenguaje
// visual que un `<details>` nativo, sin serlo (acá el estado es propio, no
// hay conteo de filas ocultas que mostrar en el resumen).
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={`transition-transform ${expanded ? "" : "-rotate-90"}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

type DiaryPages = InfiniteData<DiaryListResponse, number>;

// Agrupa las entradas (ya en orden cronológico descendente) por mes calendario
// para la vista de cronología (openspec: deepen-listening-diary, D4). Lineal:
// las entradas de un mismo mes vienen contiguas. No agrega conteos ni totales
// — es la misma información, con un encabezado por mes.
function groupByMonth(entries: ListenEntry[], locale: string, timeZone: string) {
  const formatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone });
  const groups: { key: string; label: string; entries: ListenEntry[] }[] = [];
  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const key = monthKey(date, timeZone);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, label: formatter.format(date), entries: [entry] });
    } else {
      last.entries.push(entry);
    }
  }
  return groups;
}

const TARGET_TYPE_KEY = { artist: "artist", "release-group": "album", recording: "song" } as const;

export function DiaryActivityList({ initial, initialFilters = EMPTY_DIARY_FILTERS, empty }: DiaryActivityListProps) {
  const t = useTranslations("diary");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? "UTC";
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<DiaryFiltersState>(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.q);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addToListEntryId, setAddToListEntryId] = useState<string | null>(null);
  const [showInListsEntryId, setShowInListsEntryId] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [autoLoadStopped, setAutoLoadStopped] = useState(false);
  // Meses colapsados en la Cronología (clave = `monthKey`, la misma que ya usa
  // `groupByMonth`) — puramente en memoria, no persiste ni toca el backend
  // (openspec: add-diary-date-navigation). Todo mes arranca expandido.
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  // Confirmación de guardado: sin texto ("Guardado"), un destello ámbar que se
  // apaga solo — el cierre automático del formulario ya dice "esto se guardó";
  // el destello es el refuerzo visual para quien no estaba mirando el botón.
  // Anuncio accesible aparte (`sr-only`) para quien usa lector de pantalla.
  const [savedId, setSavedId] = useState<string | null>(null);
  // Destello + anuncio del toggle de Want to Listen desde el menú de la fila
  // (openspec: add-diary-relisten-action) — mismo mecanismo que `savedId`,
  // separado porque el resultado (agregado/quitado) depende de la respuesta
  // del toggle, no es siempre "guardado".
  const [wantToListenResult, setWantToListenResult] = useState<{ id: string; added: boolean } | null>(null);
  // Destello del toggle de destacado desde el menú de la fila (openspec:
  // rework-user-profile, `listen-diary` "Destacar una entrada del diario") —
  // mismo mecanismo que `wantToListenResult`.
  const [highlightResult, setHighlightResult] = useState<{ id: string; highlighted: boolean } | null>(null);

  // Debounce del buscador: espera a que el usuario deje de tipear antes de
  // disparar la query — evita una request por tecla.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setFilters((current) => (current.q === searchInput ? current : { ...current, q: searchInput }));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  // Los filtros viven en la URL (D7) con `replaceState`: sin volver a renderizar
  // el servidor ni sumar una entrada al historial por cada cambio.
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    const next = filtersToSearchParams(filters, current);
    if (next.toString() === current.toString()) return;
    const query = next.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [filters]);

  useEffect(() => {
    if (!savedId) return;
    const timeout = window.setTimeout(() => setSavedId(null), 1500);
    return () => window.clearTimeout(timeout);
  }, [savedId]);

  useEffect(() => {
    if (!wantToListenResult) return;
    const timeout = window.setTimeout(() => setWantToListenResult(null), 1500);
    return () => window.clearTimeout(timeout);
  }, [wantToListenResult]);

  useEffect(() => {
    if (!highlightResult) return;
    const timeout = window.setTimeout(() => setHighlightResult(null), 1500);
    return () => window.clearTimeout(timeout);
  }, [highlightResult]);

  const isFiltered = hasActiveFilters(filters);
  const seededFilters = JSON.stringify(toApiFilters(filters)) === JSON.stringify(toApiFilters(initialFilters));
  // La zona viaja con los filtros (y en la clave de la query): año y mes se
  // cuentan en la misma zona con la que se agrupa por mes (D1).
  const apiFilters = { ...toApiFilters(filters), timeZone };
  const queryKey = queryKeys.myDiary(apiFilters);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isPending, isError, isPlaceholderData } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => getMyDiary(pageParam, PAGE_SIZE, apiFilters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    // La página 1 de los filtros de la URL ya vino resuelta del servidor — no
    // tiene sentido volver a pedirla apenas se monta. Cualquier otra
    // combinación es una serie nueva, sin nada que sembrar.
    initialData: seededFilters ? () => ({ pages: [initial], pageParams: [1] }) : undefined,
    staleTime: Infinity,
    // Al cambiar un filtro, sigue mostrando los resultados anteriores hasta que
    // llegan los nuevos en vez de vaciar la lista por un instante.
    placeholderData: keepPreviousData,
  });

  // Meses con al menos una escucha, para poblar los filtros de Año y Mes —
  // nunca ofrecen una combinación garantizada vacía (openspec:
  // add-diary-date-navigation). Se pide una sola vez; no depende de los
  // filtros activos (los años/meses disponibles no cambian según lo que el
  // usuario esté filtrando en este momento).
  const { data: monthsData } = useQuery({
    queryKey: queryKeys.myDiaryMonths(timeZone),
    queryFn: () => getMyDiaryMonths(timeZone),
    staleTime: 60_000,
  });
  const months = useMemo(() => monthsData?.months ?? [], [monthsData]);
  const toggleMonthCollapsed = (key: string) => {
    setCollapsedMonths((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const entries = data?.pages.flatMap((page) => page.entries) ?? initial.entries;
  const monthGroups = useMemo(() => groupByMonth(entries, locale, timeZone), [entries, locale, timeZone]);
  // Día a mostrar por fila: solo cuando cambia respecto a la fila anterior
  // *del mismo grupo de mes* (openspec: redesign-diary-row) — dos escuchas
  // consecutivas del mismo día muestran el número una sola vez.
  const showDayById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const group of monthGroups) {
      group.entries.forEach((entry, index) => {
        const previous = group.entries[index - 1];
        const showDay =
          index === 0 ||
          dayKey(new Date(entry.createdAt), timeZone) !== dayKey(new Date(previous!.createdAt), timeZone);
        map.set(entry.id, showDay);
      });
    }
    return map;
  }, [monthGroups, timeZone]);

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

  const updateCachedEntries = (matches: (entry: ListenEntry) => boolean, update: (entry: ListenEntry) => ListenEntry) => {
    queryClient.setQueryData<DiaryPages>(queryKey, (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              entries: page.entries.map((item) => (matches(item) ? update(item) : item)),
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

  // Agrega una entrada nueva al principio de la primera página cargada (openspec:
  // redesign-diary-row, "Registrar otra escucha" desde la fila) — la entrada
  // recién creada es siempre la más reciente, así que va al frente sin romper
  // el orden cronológico descendente.
  const addCachedEntry = (created: ListenEntry) => {
    queryClient.setQueryData<DiaryPages>(queryKey, (old) => {
      if (!old || old.pages.length === 0) return old;
      const [firstPage, ...rest] = old.pages;
      return {
        ...old,
        pages: [{ ...firstPage!, entries: [created, ...firstPage!.entries] }, ...rest],
      };
    });
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

  const handleLogAnother = async (entry: ListenEntry) => {
    setActionError(false);
    try {
      const created = await createListenEntry({ type: entry.target.type, id: entry.target.id });
      addCachedEntry(created);
      setExpandedId(created.id);
    } catch {
      setActionError(true);
    }
  };

  // "Quiero volver a escuchar" desde el menú de la fila (openspec:
  // add-diary-relisten-action): reutiliza el mismo toggle que el botón de
  // catálogo. Como el toggle puede tanto agregar como quitar según el estado
  // previo (y el menú no refleja el estado actual), el resultado se anuncia
  // explícitamente para que nunca sea una sorpresa silenciosa. No disponible
  // para canciones — Want to Listen no las admite.
  const handleToggleWantToListen = async (entry: ListenEntry) => {
    if (entry.target.type === "recording") return;
    setActionError(false);
    try {
      const result = await toggleWantToListen({ type: entry.target.type, id: entry.target.id });
      const added = result !== null;
      // Todas las escuchas del mismo objetivo comparten el estado de Pendientes.
      updateCachedEntries(
        (item) => item.target.type === entry.target.type && item.target.id === entry.target.id,
        (item) => ({ ...item, inWantToListen: added }),
      );
      setWantToListenResult({ id: entry.id, added });
    } catch {
      setActionError(true);
    }
  };

  // "Destacar"/"Quitar destacado" desde el menú de la fila (openspec:
  // rework-user-profile, spec `listen-diary`): la entrada destacada se vuelve
  // visible en el perfil más allá de su audiencia normal, sin modificarla.
  const handleToggleHighlight = async (entry: ListenEntry) => {
    setActionError(false);
    try {
      const updated = entry.isHighlighted
        ? await unhighlightListenEntry(entry.id)
        : await highlightListenEntry(entry.id);
      updateCachedEntry(updated);
      setHighlightResult({ id: entry.id, highlighted: updated.isHighlighted ?? false });
    } catch {
      setActionError(true);
    }
  };

  const handleLoadMore = () => {
    setActionError(false);
    setAutoLoadStopped(false);
    fetchNextPage().catch(() => setActionError(true));
  };

  // Carga continua (D8). Un error la detiene hasta que se use el botón, para no
  // reintentar en bucle mientras el centinela sigue a la vista.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isError) setAutoLoadStopped(true);
  }, [isError]);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage || autoLoadStopped) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (observed) => {
        if (!observed.some((item) => item.isIntersecting)) return;
        fetchNextPage().catch(() => setAutoLoadStopped(true));
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, autoLoadStopped, fetchNextPage]);

  const clearFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_DIARY_FILTERS);
  };

  // Una fila del diario, dentro de un grupo de mes de la vista de Cronología.
  const renderEntry = (entry: ListenEntry, showDay: boolean) => {
    const body = entry.body != null && entry.body.trim() !== "" ? entry.body : null;
    const expanded = expandedId === entry.id;
    const pendingDelete = pendingDeleteId === entry.id;
    const deleting = deletingId === entry.id;
    const addingToList = addToListEntryId === entry.id;
    const showingInLists = showInListsEntryId === entry.id;

    return (
      <li
        key={entry.id}
        className={`${body ? "py-4" : "py-3"} first:pt-0 last:pb-0 transition-colors duration-1000 ${
          savedId === entry.id || wantToListenResult?.id === entry.id || highlightResult?.id === entry.id
            ? "bg-amber/10"
            : "bg-transparent"
        }`}
      >
        <div className="grid grid-cols-[1.75rem_2.5rem_minmax(0,1fr)_auto] gap-x-2.5 sm:grid-cols-[2.25rem_3rem_minmax(0,1fr)_auto] sm:gap-x-4">
          <DiaryDateBlock iso={entry.createdAt} showDay={showDay} weekday />
          <DiaryCover entry={entry} className="size-10 sm:size-12" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 [&_a]:line-clamp-2">
                <TargetTitle
                  href={targetHref(entry.target.type, entry.target.id, entry.target.title, entry.target.subtitle ?? null)}
                  label={entry.target.title}
                  artist={null}
                  layout="inline"
                />
              </span>
              <ReactionGlyph reaction={entry.reaction} variant="accent" />
            </div>
            <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 font-data text-xs text-paper-muted">
              {entry.target.subtitle ? (
                <>
                  {entry.target.artistId ? (
                    <Link
                      href={targetHref("artist", entry.target.artistId, entry.target.subtitle)}
                      className="transition-colors hover:text-paper"
                    >
                      {entry.target.subtitle}
                    </Link>
                  ) : (
                    <span>{entry.target.subtitle}</span>
                  )}
                  <span aria-hidden="true">·</span>
                </>
              ) : null}
              <span>{t(`targetType.${TARGET_TYPE_KEY[entry.target.type]}`)}</span>
              <span aria-hidden="true">·</span>
              <span>{t(`context.${entry.listenContext}`)}</span>
              <span aria-hidden="true">·</span>
              <AudienceIcon audience={entry.audience} />
            </p>
          </div>
          <div className="-mr-2.5 -mt-2.5 flex items-start sm:-mr-1 sm:-mt-1">
            <button
              type="button"
              aria-label={t("edit")}
              aria-expanded={expanded}
              className="flex size-11 items-center justify-center rounded text-paper-muted transition-colors hover:text-paper sm:size-8"
              onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
            >
              <PencilIcon />
            </button>
            <RowMenu label={t("moreActions")} triggerClassName="size-11 sm:size-8">
              <RowMenuItem onSelect={() => void handleLogAnother(entry)}>{t("logAnother")}</RowMenuItem>
              <RowMenuItem onSelect={() => setAddToListEntryId((current) => (current === entry.id ? null : entry.id))}>
                {t("addToList")}
              </RowMenuItem>
              <RowMenuItem onSelect={() => setShowInListsEntryId((current) => (current === entry.id ? null : entry.id))}>
                {t("showInLists")}
              </RowMenuItem>
              {entry.target.type !== "recording" && (
                <RowMenuItem onSelect={() => void handleToggleWantToListen(entry)}>
                  {t(entry.inWantToListen ? "unwantToListen" : "wantToListen")}
                </RowMenuItem>
              )}
              <RowMenuItem onSelect={() => void handleToggleHighlight(entry)}>
                {t(entry.isHighlighted ? "unhighlight" : "highlight")}
              </RowMenuItem>
              <RowMenuSeparator />
              <RowMenuItem danger onSelect={() => setPendingDeleteId(entry.id)}>
                {t("delete")}
              </RowMenuItem>
            </RowMenu>
          </div>
          <div className="col-start-3 col-end-5 min-w-0">
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
            {body ? <ProsePanel body={body} variant="impression" /> : null}
            {addingToList && (
              <div className="mt-3">
                <AddToListPanel
                  target={{ type: entry.target.type, id: entry.target.id }}
                  onClose={() => setAddToListEntryId(null)}
                />
              </div>
            )}
            {showingInLists && (
              <div className="mt-3">
                <ListsContainingItemPanel
                  target={{ type: entry.target.type, id: entry.target.id }}
                  canSave
                  onClose={() => setShowInListsEntryId(null)}
                />
              </div>
            )}
            {expanded && (
              <div className="mt-3">
                <ListenEntryForm
                  entryId={entry.id}
                  target={entry.target}
                  showTarget={false}
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
  };

  const filterBar = (
    <DiaryFilterBar
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      filters={filters}
      onChange={(next) => setFilters({ ...next, q: filters.q })}
      onClear={clearFilters}
      months={months}
    />
  );

  if (entries.length === 0 && !isPending) {
    return (
      <div className="flex w-full flex-col gap-4">
        {filterBar}
        <EmptyState
          title={isFiltered ? t("noResultsTitle") : (empty?.title ?? t("emptyTitle"))}
          description={isFiltered ? t("noResultsDescription") : (empty?.description ?? t("emptyDescription"))}
          action={
            isFiltered ? (
              <Button variant="secondary" onClick={clearFilters}>
                {t("clearFilters")}
              </Button>
            ) : (
              <LogListenButton variant="primary" />
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {filterBar}
      <span role="status" aria-live="polite" className="sr-only">
        {savedId
          ? t("savedAnnouncement")
          : wantToListenResult
            ? t(wantToListenResult.added ? "wantToListenAdded" : "wantToListenRemoved")
            : highlightResult
              ? t(highlightResult.highlighted ? "highlighted" : "unhighlighted")
              : null}
      </span>
      {/* Mientras llegan los resultados de un filtro nuevo, la lista anterior
          queda atenuada y marcada como ocupada (openspec: redesign-diary-page, D5). */}
      <div
        aria-busy={isPlaceholderData}
        className={`flex flex-col gap-6 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}
      >
        {monthGroups.map((group) => {
          const collapsed = collapsedMonths.has(group.key);
          return (
            <div key={group.key} className="flex flex-col gap-2">
              {/* Encabezado fijo bajo el header global mientras se recorren las
                  filas del mes (D8); fondo opaco para que no se transparenten. */}
              <div className="sticky top-16 z-10 -mx-1 flex items-center gap-1 bg-ink px-1 py-0.5">
                <button
                  type="button"
                  aria-expanded={!collapsed}
                  aria-label={collapsed ? t("expandMonth", { month: group.label }) : t("collapseMonth", { month: group.label })}
                  onClick={() => toggleMonthCollapsed(group.key)}
                  className="-m-3 flex size-11 items-center justify-center rounded text-paper-muted transition-colors hover:text-paper sm:-m-1.5 sm:size-8"
                >
                  <ChevronIcon expanded={!collapsed} />
                </button>
                <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted [&::first-letter]:uppercase">
                  {group.label}
                </h3>
              </div>
              {!collapsed && (
                <ul className="divide-y divide-ink-border">
                  {group.entries.map((entry) => renderEntry(entry, showDayById.get(entry.id) ?? true))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      {/* Centinela de carga continua (D8): al acercarse al final se pide la
          página siguiente; «Cargar más» queda como respaldo y para teclado. */}
      {hasNextPage && !autoLoadStopped && <div ref={sentinelRef} aria-hidden="true" className="h-px" />}
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
