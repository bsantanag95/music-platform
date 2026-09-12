"use client";

import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { DiaryDateBlock, ProsePanel, TargetTitle, dayKey, monthKey } from "@/components/feed/feed-row-parts";
import { targetHref } from "@/components/feed/feed-target";
import { AddToListPanel } from "@/components/lists/AddToListPanel";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import { ListenEntryForm } from "./ListenEntryForm";
import { ReactionGlyph } from "./ReactionBadge";
import {
  createListenEntry,
  deleteListenEntry,
  getMyDiary,
  getMyDiaryMonths,
  type DiaryFiltersParams,
} from "@/lib/api/diary";
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
function coverForEntry(entry: ListenEntry): string | null {
  return entry.target.type === "release-group" ? entry.target.coverThumbUrl : null;
}

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

// Etiqueta de un mes 1-12 para las opciones del filtro de Mes — mismo
// mecanismo (`Intl.DateTimeFormat`) que ya usan los encabezados de
// `groupByMonth`, sin agregar 12 claves de traducción nuevas. El año es
// arbitrario (2000): solo se usa para construir una fecha válida, `month`
// no depende de qué año se elija.
function monthOptionLabel(month: number, locale: string): string {
  const date = new Date(Date.UTC(2000, month - 1, 1));
  // `timeZone: "UTC"` es obligatorio acá: la fecha es un vehículo sintético
  // para extraer "el nombre local del mes N", sin significado horario propio
  // — formatearla en la zona horaria del navegador puede correr el mes un
  // día para atrás en usuarios al oeste de UTC (medianoche UTC del día 1 cae
  // en el último día del mes anterior en su hora local).
  const label = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Estado de filtros de la UI: `""` es "sin filtrar" para los tres `<select>`
// (más simple que `undefined` para el valor controlado de un elemento nativo).
// `q` es el valor tal cual lo tipea el usuario, sin debounce — `useDiaryFilters`
// (más abajo) es quien lo recorta a la versión que efectivamente viaja al servidor.
// `year`/`month` viven como string (valor nativo de un `<select>` controlado),
// igual que el resto — `month` solo viaja a la API si `year` también está
// elegido (openspec: add-diary-date-navigation; el selector de Mes ni
// siquiera ofrece opciones hasta elegir un Año, ver `filterBar`).
interface DiaryFiltersState {
  q: string;
  context: ListenContext | "";
  reaction: ListenReaction | "none" | "";
  audience: DiaryAudience | "";
  year: string;
  month: string;
}

const EMPTY_FILTERS: DiaryFiltersState = {
  q: "",
  context: "",
  reaction: "",
  audience: "",
  year: "",
  month: "",
};

function toApiFilters(filters: DiaryFiltersState): DiaryFiltersParams {
  const q = filters.q.trim();
  return {
    q: q ? q : undefined,
    context: filters.context || undefined,
    reaction: filters.reaction || undefined,
    audience: filters.audience || undefined,
    year: filters.year ? Number(filters.year) : undefined,
    month: filters.year && filters.month ? Number(filters.month) : undefined,
  };
}

function hasActiveFilters(filters: DiaryFiltersState): boolean {
  return Boolean(
    filters.q.trim() || filters.context || filters.reaction || filters.audience || filters.year,
  );
}

type DiaryPages = InfiniteData<DiaryListResponse, number>;

// Agrupa las entradas (ya en orden cronológico descendente) por mes calendario
// para la vista de cronología (openspec: deepen-listening-diary, D4). Lineal:
// las entradas de un mismo mes vienen contiguas. No agrega conteos ni totales
// — es la misma información, con un encabezado por mes.
function groupByMonth(entries: ListenEntry[], locale: string) {
  const formatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const groups: { key: string; label: string; entries: ListenEntry[] }[] = [];
  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const key = monthKey(date);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, label: formatter.format(date), entries: [entry] });
    } else {
      last.entries.push(entry);
    }
  }
  return groups;
}

export function DiaryActivityList({ initial, empty }: DiaryActivityListProps) {
  const t = useTranslations("diary");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<DiaryFiltersState>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [addToListEntryId, setAddToListEntryId] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  // Meses colapsados en la Cronología (clave = `monthKey`, la misma que ya usa
  // `groupByMonth`) — puramente en memoria, no persiste ni toca el backend
  // (openspec: add-diary-date-navigation). Todo mes arranca expandido.
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
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

  // Meses con al menos una escucha, para poblar los filtros de Año y Mes —
  // nunca ofrecen una combinación garantizada vacía (openspec:
  // add-diary-date-navigation). Se pide una sola vez; no depende de los
  // filtros activos (los años/meses disponibles no cambian según lo que el
  // usuario esté filtrando en este momento).
  const { data: monthsData } = useQuery({
    queryKey: queryKeys.myDiaryMonths(),
    queryFn: getMyDiaryMonths,
    staleTime: 60_000,
  });
  const months = useMemo(() => monthsData?.months ?? [], [monthsData]);
  const availableYears = useMemo(
    () => Array.from(new Set(months.map((m) => m.year))).sort((a, b) => b - a),
    [months],
  );
  const availableMonthsForYear = useMemo(() => {
    if (!filters.year) return [];
    const year = Number(filters.year);
    return months
      .filter((m) => m.year === year)
      .map((m) => m.month)
      .sort((a, b) => b - a);
  }, [months, filters.year]);

  const toggleMonthCollapsed = (key: string) => {
    setCollapsedMonths((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const entries = data?.pages.flatMap((page) => page.entries) ?? initial.entries;
  const monthGroups = useMemo(() => groupByMonth(entries, locale), [entries, locale]);
  // Día a mostrar por fila: solo cuando cambia respecto a la fila anterior
  // *del mismo grupo de mes* (openspec: redesign-diary-row) — dos escuchas
  // consecutivas del mismo día muestran el número una sola vez.
  const showDayById = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const group of monthGroups) {
      group.entries.forEach((entry, index) => {
        const previous = group.entries[index - 1];
        const showDay = index === 0 || dayKey(new Date(entry.createdAt)) !== dayKey(new Date(previous!.createdAt));
        map.set(entry.id, showDay);
      });
    }
    return map;
  }, [monthGroups]);

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

  const handleLoadMore = () => {
    setActionError(false);
    fetchNextPage().catch(() => setActionError(true));
  };

  const clearFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
  };

  // Una fila del diario, dentro de un grupo de mes de la vista de Cronología.
  const renderEntry = (entry: ListenEntry, showDay: boolean) => {
    const body = entry.body != null && entry.body.trim() !== "" ? entry.body : null;
    const expanded = expandedId === entry.id;
    const pendingDelete = pendingDeleteId === entry.id;
    const deleting = deletingId === entry.id;
    const addingToList = addToListEntryId === entry.id;

    return (
      <li
        key={entry.id}
        className={`${body ? "py-4" : "py-3"} first:pt-0 last:pb-0 transition-colors duration-1000 ${
          savedId === entry.id ? "bg-amber/10" : "bg-transparent"
        }`}
      >
        <div className="flex gap-3 sm:gap-4">
          <DiaryDateBlock iso={entry.createdAt} showDay={showDay} />
          <CoverThumb cover={coverForEntry(entry)} label="" className="size-11 sm:size-12" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="flex min-w-0 items-baseline gap-1 font-data text-xs text-paper-muted">
                <span>{t(`context.${entry.listenContext}`)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-data text-xs text-paper-muted">
                  {t(`audience.${entry.audience}`)}
                </span>
                <ReactionGlyph reaction={entry.reaction} />
                <button
                  type="button"
                  aria-label={t("edit")}
                  className="flex size-6 items-center justify-center rounded text-paper-muted transition-colors hover:text-paper"
                  onClick={() => setExpandedId((current) => (current === entry.id ? null : entry.id))}
                >
                  <PencilIcon />
                </button>
                <RowMenu label={t("moreActions")}>
                  <RowMenuItem onSelect={() => void handleLogAnother(entry)}>{t("logAnother")}</RowMenuItem>
                  <RowMenuItem onSelect={() => setAddToListEntryId((current) => (current === entry.id ? null : entry.id))}>
                    {t("addToList")}
                  </RowMenuItem>
                  <RowMenuItem danger onSelect={() => setPendingDeleteId(entry.id)}>
                    {t("delete")}
                  </RowMenuItem>
                </RowMenu>
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
                artistHref={entry.target.artistId ? targetHref("artist", entry.target.artistId) : null}
                layout="inline"
              />
            </div>
            {body ? <ProsePanel body={body} variant="impression" /> : null}
            {addingToList && (
              <div className="mt-3">
                <AddToListPanel
                  target={{ type: entry.target.type, id: entry.target.id }}
                  onClose={() => setAddToListEntryId(null)}
                />
              </div>
            )}
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
        <FilterSelect
          value={filters.year}
          onChange={(value) =>
            setFilters((current) => {
              const monthsForYear = months.filter((m) => String(m.year) === value).map((m) => m.month);
              const monthStillValid = current.month !== "" && monthsForYear.includes(Number(current.month));
              return { ...current, year: value, month: monthStillValid ? current.month : "" };
            })
          }
          ariaLabel={t("yearLabel")}
          widthClassName="w-[9ch]"
        >
          <option value="">{t("filterAllYear")}</option>
          {availableYears.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          value={filters.month}
          onChange={(value) => setFilters((current) => ({ ...current, month: value }))}
          ariaLabel={t("monthLabel")}
          widthClassName="w-[11ch]"
        >
          <option value="">{t("filterAllMonth")}</option>
          {availableMonthsForYear.map((month) => (
            <option key={month} value={String(month)}>
              {monthOptionLabel(month, locale)}
            </option>
          ))}
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
      <div className="flex flex-col gap-6">
        {monthGroups.map((group) => {
          const collapsed = collapsedMonths.has(group.key);
          return (
            <div key={group.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-expanded={!collapsed}
                  aria-label={collapsed ? t("expandMonth", { month: group.label }) : t("collapseMonth", { month: group.label })}
                  onClick={() => toggleMonthCollapsed(group.key)}
                  className="flex size-5 items-center justify-center rounded text-paper-muted transition-colors hover:text-paper"
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
