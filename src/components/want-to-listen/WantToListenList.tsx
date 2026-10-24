"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { OWN_DATA_CHANGED_EVENT } from "@/components/quick-actions/quick-actions-changes";
import { activateArtistJourney } from "@/lib/api/artist-journeys";
import { createListenEntry, deleteListenEntry } from "@/lib/api/diary";
import { getMyWantToListen, removeFromWantToListen, toggleWantToListen } from "@/lib/api/want-to-listen";
import {
  type WantToListenCounts,
  type WantToListenEntry,
  type WantToListenFilters,
  type WantToListenListResponse,
  type WantToListenTargetType,
} from "@/lib/api/schemas";
import { useJourneyStatuses } from "./use-journey-statuses";
import { PendingUndoToast } from "./PendingUndoToast";
import { WantToListenModeSwitcher } from "./WantToListenModeSwitcher";
import { WantToListenSection } from "./WantToListenSection";
import { WantToListenSortSelect } from "./WantToListenSortSelect";
import { WantToListenTypeSegments } from "./WantToListenTypeSegments";
import { groupWantToListenByType } from "./want-to-listen-shared";
import { useWantToListenViewMode } from "./use-want-to-listen-view-mode";

interface WantToListenListProps {
  initial: WantToListenListResponse;
  /** Tipo y orden con los que el servidor sembró la primera página (desde la URL). */
  initialFilters?: WantToListenFilters;
}

const PAGE_SIZE = 20;

// Aviso tras quitar o marcar como escuchada una entrada; `listenId` solo cuando se registró una escucha.
interface Toast {
  key: number;
  entry: WantToListenEntry;
  listenId?: string;
  /** El deshacer falló: el aviso lo dice y ya no ofrece Deshacer. */
  failed?: boolean;
}

// Carátulas que se cargan con prioridad: las primeras entradas, las que se ven sin desplazarse.
const PRIORITY_COVERS = 6;

// Marcador del listado mientras se lee el modo guardado: unas filas neutras, sin fichas ni texto,
// para no pintar el modo por defecto y saltar después al de la persona.
function ListPlaceholder() {
  return (
    <div aria-hidden data-testid="want-to-listen-list-placeholder" className="flex flex-col gap-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-16 rounded-lg bg-ink-surface motion-safe:animate-pulse" />
      ))}
    </div>
  );
}

// Tipo y orden en la URL, sin crear historial: compartir o recargar abre la misma vista. El orden por
// defecto no se escribe.
function writeFiltersToUrl(filters: WantToListenFilters) {
  const params = new URLSearchParams(window.location.search);
  params.delete("type");
  params.delete("sort");
  if (filters.type) params.set("type", filters.type);
  if (filters.sort && filters.sort !== "recent") params.set("sort", filters.sort);
  const query = params.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

// Listado propio de Want to Listen: dos secciones (artistas, álbumes) — mismo
// criterio de agrupación por tipo que el muro de favoritos — con los mismos
// tres modos de visualización que el detalle de listas (Detallada/Índice/
// Gráfico), compartidos entre ambas secciones. Sin audiencia: es una lista de
// gestión personal. La barra filtra por tipo y ordena en el servidor
// (openspec: redesign-want-to-listen-toolbar); las cantidades por tipo
// (`counts`) vienen del servidor y no dependen de lo cargado.
export function WantToListenList({ initial, initialFilters = {} }: WantToListenListProps) {
  const t = useTranslations("wantToListen");
  const [mode, setMode, modeReady] = useWantToListenViewMode();
  const [items, setItems] = useState<WantToListenEntry[]>(initial.items);
  const [counts, setCounts] = useState<WantToListenCounts>(initial.counts);
  const [filters, setFilters] = useState<WantToListenFilters>(initialFilters);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Entrada cuya acción falló: el aviso va junto a ella, no al final de la página.
  const [errorId, setErrorId] = useState<string | null>(null);
  const [listOpenId, setListOpenId] = useState<string | null>(null);
  // Un solo aviso a la vez (openspec: redesign-want-to-listen-views, D3): una acción nueva reemplaza al anterior.
  const [toast, setToast] = useState<Toast | null>(null);
  const [undoing, setUndoing] = useState(false);
  const toastSeq = useRef(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Cada recarga de la primera página lleva un número: una respuesta vieja no pisa a una más nueva.
  const requestRef = useRef(0);
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const groups = useMemo(() => groupWantToListenByType(items), [items]);
  // Antes del retorno temprano: los hooks no pueden ir después de un `return` condicional.
  const journeys = useJourneyStatuses(items);

  const reload = useCallback(async (next: WantToListenFilters) => {
    const request = ++requestRef.current;
    setRefreshing(true);
    setLoadError(false);
    try {
      const response = await getMyWantToListen(1, PAGE_SIZE, next);
      if (request !== requestRef.current) return;
      setItems(response.items);
      setCounts(response.counts);
      setPage(response.page);
      setHasNext(response.hasNext);
    } catch {
      if (request === requestRef.current) setLoadError(true);
    } finally {
      if (request === requestRef.current) setRefreshing(false);
    }
  }, []);

  // Lo anotado desde el diálogo global («Añadir pendiente» o «+ Añadir») no pasa por esta lista: al avisar
  // un cambio se vuelve a pedir la primera página con los filtros actuales.
  useEffect(() => {
    const onChanged = () => void reload(filtersRef.current);
    window.addEventListener(OWN_DATA_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(OWN_DATA_CHANGED_EVENT, onChanged);
  }, [reload]);

  const changeFilters = (next: WantToListenFilters) => {
    setFilters(next);
    writeFiltersToUrl(next);
    void reload(next);
  };

  const dismissToast = useCallback(() => setToast(null), []);

  const total = counts.artist + counts["release-group"];

  // Saca la entrada de la lista y descuenta su tipo; sin entradas del tipo filtrado se vuelve a Todo.
  const dropEntry = (entry: WantToListenEntry) => {
    setItems((current) => current.filter((item) => item.id !== entry.id));
    setCounts((current) => ({ ...current, [entry.targetType]: Math.max(0, current[entry.targetType] - 1) }));
    if (filters.type === entry.targetType && counts[entry.targetType] <= 1) {
      changeFilters({ ...filters, type: undefined });
    }
  };

  // Deshacer vuelve a anotar el objetivo (y, si se había registrado, borra la escucha) y recarga la primera página.
  const undo = async (current: Toast) => {
    setUndoing(true);
    try {
      if (current.listenId) await deleteListenEntry(current.listenId);
      await toggleWantToListen({ type: current.entry.targetType, id: current.entry.target.id });
      setToast(null);
      await reload(filtersRef.current);
    } catch {
      setToast({ ...current, key: ++toastSeq.current, failed: true });
    } finally {
      setUndoing(false);
    }
  };

  const toastNode = toast ? (
    <PendingUndoToast
      key={toast.key}
      message={
        toast.failed
          ? t("undoError")
          : toast.listenId
            ? t("listenedToast", { title: toast.entry.target.title })
            : t("removedToast", { title: toast.entry.target.title })
      }
      onUndo={toast.failed ? undefined : () => void undo(toast)}
      onExpire={dismissToast}
      undoing={undoing}
    />
  ) : null;

  if (total === 0) {
    return (
      <>
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
        {toastNode}
      </>
    );
  }

  const priorityIds = new Set(items.slice(0, PRIORITY_COVERS).map((item) => item.id));
  // Con un tipo elegido solo se muestra su sección.
  const visibleGroups = filters.type ? groups.filter((group) => group.type === filters.type) : groups;

  const handleRemove = async (id: string) => {
    const entry = items.find((item) => item.id === id);
    if (!entry) return;
    setBusyId(id);
    setErrorId(null);
    try {
      await removeFromWantToListen({ type: entry.targetType, id: entry.target.id });
      dropEntry(entry);
      setToast({ key: ++toastSeq.current, entry });
    } catch {
      setErrorId(id);
    } finally {
      setBusyId(null);
    }
  };

  // «Registrar escucha»: registra la escucha y el servicio del Diario retira la entrada de Pendientes (D2).
  const handleListened = async (id: string) => {
    const entry = items.find((item) => item.id === id);
    if (!entry) return;
    setBusyId(id);
    setErrorId(null);
    try {
      const created = await createListenEntry({ type: entry.targetType, id: entry.target.id });
      dropEntry(entry);
      setToast({ key: ++toastSeq.current, entry, listenId: created.id });
    } catch {
      setErrorId(id);
    } finally {
      setBusyId(null);
    }
  };

  const handleActivateJourney = async (artistId: string) => {
    try {
      await activateArtistJourney(artistId);
      journeys.markAdded(artistId);
    } catch {
      journeys.markError(artistId);
    }
  };

  const handleLoadMore = async () => {
    setLoading(true);
    setLoadError(false);
    const request = requestRef.current;
    try {
      const next = await getMyWantToListen(page + 1, PAGE_SIZE, filters);
      if (request !== requestRef.current) return;
      setItems((current) => [...current, ...next.items]);
      setCounts(next.counts);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-border pb-4">
        <WantToListenTypeSegments
          value={filters.type ?? ""}
          counts={counts}
          onChange={(type: WantToListenTargetType | "") =>
            changeFilters({ ...filters, type: type || undefined })
          }
        />
        <div className="flex flex-wrap items-center gap-3">
          <WantToListenSortSelect
            value={filters.sort ?? "recent"}
            onChange={(sort) => changeFilters({ ...filters, sort })}
          />
          <div className={modeReady ? "" : "invisible"} aria-hidden={modeReady ? undefined : true}>
            <WantToListenModeSwitcher mode={mode} onChange={setMode} />
          </div>
        </div>
      </div>

      {modeReady ? (
        <div
          aria-busy={refreshing}
          className={`flex flex-col gap-6 transition-opacity ${refreshing ? "opacity-50" : ""}`}
        >
          {visibleGroups.map((group) => (
            <WantToListenSection
              key={group.type}
              group={group}
              mode={mode}
              total={counts[group.type]}
              priorityIds={priorityIds}
              actions={{
                busy: busyId !== null,
                errorId,
                listened: (id) => void handleListened(id),
                remove: (id) => void handleRemove(id),
                listOpenId,
                openList: setListOpenId,
                closeList: () => setListOpenId(null),
                journeyStatus: journeys.statusOf,
                activateJourney: (artistId) => void handleActivateJourney(artistId),
              }}
            />
          ))}
        </div>
      ) : (
        <ListPlaceholder />
      )}

      {hasNext || loadError ? (
        <div className="flex flex-col items-center gap-2">
          {hasNext ? (
            <Button variant="secondary" disabled={loading || refreshing} onClick={() => void handleLoadMore()}>
              {loading ? t("loadingMore") : t("loadMore")}
            </Button>
          ) : null}
          {loadError && (
            <span role="alert" className="font-data text-xs text-danger">
              {t("loadError")}
            </span>
          )}
        </div>
      ) : null}

      {toastNode}
    </div>
  );
}
