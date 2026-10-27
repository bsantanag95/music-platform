"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { normalizeForSearch } from "@/components/artist-journey/artist-journey-list-shared";
import { ProgressPlaceholder } from "@/components/progress/ProgressPlaceholder";
import {
  DEFAULT_OWN_FILTERS,
  type OwnFilters,
  type OwnSort,
  type OwnStateFilter,
} from "@/components/progress/progress-tabs";
import { useProgressFilters } from "@/components/progress/use-progress-filters";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ApiError } from "@/lib/api/client";
import { archiveCamino, deleteCamino, unarchiveCamino } from "@/lib/api/camino";
import type { CaminoDetail, CaminoSummary } from "@/lib/api/schemas";
import { CaminoDeleteDialog } from "./CaminoDeleteDialog";
import { CaminoForm } from "./CaminoForm";
import { CaminoModeSwitcher } from "./CaminoModeSwitcher";
import { useCaminoViewMode } from "./use-camino-view-mode";
import { MyCaminosDetailed } from "./MyCaminosDetailed";
import { MyCaminosIndex } from "./MyCaminosIndex";
import { MyCaminosGraphic } from "./MyCaminosGraphic";

// Orden entre estados al ordenar "Por estado": en curso primero (lo activo),
// completo después, archivado al final — mismo criterio que
// `ARTIST_JOURNEY_STATES` (calcado de `ArtistJourneyList`).
const STATE_ORDER: Record<CaminoSummary["state"], number> = {
  in_progress: 0,
  complete: 1,
  archived: 2,
};

const RENDERERS = {
  detailed: MyCaminosDetailed,
  index: MyCaminosIndex,
  graphic: MyCaminosGraphic,
};

interface MyCaminosListProps {
  caminos: CaminoSummary[];
  /** Filtros leídos de la URL por la página (ya validados). */
  initialFilters?: Partial<OwnFilters>;
}

// Pestaña "Mis Caminos" de `/me/caminos` (openspec: add-camino): buscador,
// orden (por agregado, alfabético o por estado), filtro por estado y los
// mismos tres modos de visualización que Recorridos — esta lista SÍ es
// homogénea (todo propio, mismas acciones por entrada), así que admite el
// mismo mecanismo completo sin las asimetrías que tendría una lista
// mezclada con Trackeados (ver mockups de diseño, decisión del usuario:
// pestañas separadas en vez de una lista unificada).
//
// Desde refine-progress-page-phase1: filtros en la URL, diálogo de borrado y marcador hasta leer el modo, igual que
// `ArtistJourneyList`.
export function MyCaminosList({ caminos: initial, initialFilters }: MyCaminosListProps) {
  const t = useTranslations("camino");
  const [mode, setMode, modeReady] = useCaminoViewMode();
  const [filters, setFilter] = useProgressFilters(DEFAULT_OWN_FILTERS, initialFilters);
  const [items, setItems] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CaminoSummary | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [actionError, setActionError] = useState(false);

  const visible = useMemo(() => {
    const q = normalizeForSearch(filters.q.trim());
    const byState = filters.state === "all" ? items : items.filter((camino) => camino.state === filters.state);
    const filtered = q
      ? byState.filter((camino) => normalizeForSearch(camino.title).includes(q))
      : byState;
    // `items` ya llega del servidor en orden de creación descendente (más
    // reciente primero) — "recent" no necesita reordenar.
    if (filters.sort === "recent") return filtered;
    if (filters.sort === "state") {
      return [...filtered].sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]);
    }
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [items, filters]);

  async function handleDelete(caminoId: string) {
    setBusyId(caminoId);
    setDeleteError(false);
    try {
      await deleteCamino(caminoId);
      setItems((current) => current.filter((camino) => camino.id !== caminoId));
    } catch (error) {
      if (error instanceof ApiError && error.code === "CAMINO_NOT_FOUND") {
        setItems((current) => current.filter((camino) => camino.id !== caminoId));
      } else {
        setDeleteError(true);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchiveToggle(caminoId: string) {
    const camino = items.find((current) => current.id === caminoId);
    if (!camino) return;
    setBusyId(caminoId);
    setActionError(false);
    try {
      const updated: CaminoDetail =
        camino.state === "archived" ? await unarchiveCamino(caminoId) : await archiveCamino(caminoId);
      setItems((current) =>
        current.map((item) => (item.id === caminoId ? { ...item, state: updated.state } : item)),
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === "CAMINO_NOT_FOUND") {
        setItems((current) => current.filter((item) => item.id !== caminoId));
      } else {
        setActionError(true);
      }
    } finally {
      setBusyId(null);
    }
  }

  const handleCreated = (created: CaminoDetail) => {
    setShowForm(false);
    setItems((current) => [
      {
        id: created.id,
        title: created.title,
        state: created.state,
        progress: created.progress,
        coverThumbUrl: null,
        updatedAt: created.updatedAt,
      },
      ...current,
    ]);
  };

  if (items.length === 0 && !showForm) {
    return (
      <EmptyState
        title={t("myCaminosHeading")}
        description={t("myCaminosEmptyHint")}
        action={
          <Button variant="secondary" onClick={() => setShowForm(true)}>
            {t("newCamino")}
          </Button>
        }
      />
    );
  }

  const Renderer = RENDERERS[mode];

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-data text-xs text-paper-muted">{t("itemsCountShort", { count: items.length })}</span>
        {!showForm && (
          <Button variant="secondary" onClick={() => setShowForm(true)}>
            {t("newCamino")}
          </Button>
        )}
      </div>

      {showForm && <CaminoForm onCancel={() => setShowForm(false)} onCreated={handleCreated} />}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          autoComplete="off"
          value={filters.q}
          onChange={(event) => setFilter("q", event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted sm:w-auto sm:min-w-[12rem] sm:flex-1"
        />
        <FilterSelect
          value={filters.sort}
          onChange={(value) => setFilter("sort", value as OwnSort)}
          ariaLabel={t("sortLabel")}
          widthClassName="w-[13ch]"
        >
          <option value="recent">{t("sort.recent")}</option>
          <option value="alpha">{t("sort.alpha")}</option>
          <option value="state">{t("sort.state")}</option>
        </FilterSelect>
        <FilterSelect
          value={filters.state}
          onChange={(value) => setFilter("state", value as OwnStateFilter)}
          ariaLabel={t("stateFilterLabel")}
          widthClassName="w-[13ch]"
        >
          <option value="all">{t("stateFilterAll")}</option>
          <option value="in_progress">{t("stateInProgress")}</option>
          <option value="complete">{t("stateComplete")}</option>
          <option value="archived">{t("stateArchived")}</option>
        </FilterSelect>
        <div className={`ml-auto ${modeReady ? "" : "invisible"}`}>
          <CaminoModeSwitcher mode={mode} onChange={setMode} />
        </div>
      </div>

      {deleteError && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("deleteError")}
        </span>
      )}
      {actionError && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("archiveError")}
        </span>
      )}

      {!modeReady ? (
        <ProgressPlaceholder count={visible.length} />
      ) : visible.length === 0 ? (
        <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
      ) : (
        <Renderer
          caminos={visible}
          actions={{
            busyId,
            requestRemove: (caminoId) => setPendingDelete(items.find((item) => item.id === caminoId) ?? null),
            archive: (caminoId) => void handleArchiveToggle(caminoId),
          }}
        />
      )}

      <CaminoDeleteDialog
        camino={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) void handleDelete(target.id);
        }}
      />
    </div>
  );
}
