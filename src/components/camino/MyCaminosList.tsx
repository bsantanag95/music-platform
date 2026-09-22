"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { normalizeForSearch } from "@/components/artist-journey/artist-journey-list-shared";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ApiError } from "@/lib/api/client";
import { archiveCamino, deleteCamino, unarchiveCamino } from "@/lib/api/camino";
import type { CaminoDetail, CaminoSummary } from "@/lib/api/schemas";
import { CaminoForm } from "./CaminoForm";
import { CaminoModeSwitcher } from "./CaminoModeSwitcher";
import { useCaminoViewMode } from "./use-camino-view-mode";
import { MyCaminosDetailed } from "./MyCaminosDetailed";
import { MyCaminosIndex } from "./MyCaminosIndex";
import { MyCaminosGraphic } from "./MyCaminosGraphic";

type CaminoSort = "recent" | "alpha" | "state";
type CaminoStateFilter = "all" | CaminoSummary["state"];

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
}

// Pestaña "Mis Caminos" de `/me/caminos` (openspec: add-camino): buscador,
// orden (por agregado, alfabético o por estado), filtro por estado y los
// mismos tres modos de visualización que Recorridos — esta lista SÍ es
// homogénea (todo propio, mismas acciones por entrada), así que admite el
// mismo mecanismo completo sin las asimetrías que tendría una lista
// mezclada con Trackeados (ver mockups de diseño, decisión del usuario:
// pestañas separadas en vez de una lista unificada).
export function MyCaminosList({ caminos: initial }: MyCaminosListProps) {
  const t = useTranslations("camino");
  const [mode, setMode] = useCaminoViewMode();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CaminoSort>("recent");
  const [stateFilter, setStateFilter] = useState<CaminoStateFilter>("all");
  const [items, setItems] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [actionError, setActionError] = useState(false);

  const visible = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    const byState = stateFilter === "all" ? items : items.filter((camino) => camino.state === stateFilter);
    const filtered = q
      ? byState.filter((camino) => normalizeForSearch(camino.title).includes(q))
      : byState;
    // `items` ya llega del servidor en orden de creación descendente (más
    // reciente primero) — "recent" no necesita reordenar.
    if (sort === "recent") return filtered;
    if (sort === "state") {
      return [...filtered].sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]);
    }
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  }, [items, query, sort, stateFilter]);

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

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="w-full min-w-[11rem] rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted sm:max-w-xs"
          />
          <FilterSelect
            value={sort}
            onChange={(value) => setSort(value as CaminoSort)}
            ariaLabel={t("sortLabel")}
            widthClassName="w-[13ch]"
          >
            <option value="recent">{t("sort.recent")}</option>
            <option value="alpha">{t("sort.alpha")}</option>
            <option value="state">{t("sort.state")}</option>
          </FilterSelect>
          <FilterSelect
            value={stateFilter}
            onChange={(value) => setStateFilter(value as CaminoStateFilter)}
            ariaLabel={t("stateFilterLabel")}
            widthClassName="w-[13ch]"
          >
            <option value="all">{t("stateFilterAll")}</option>
            <option value="in_progress">{t("stateInProgress")}</option>
            <option value="complete">{t("stateComplete")}</option>
            <option value="archived">{t("stateArchived")}</option>
          </FilterSelect>
        </div>
        <CaminoModeSwitcher mode={mode} onChange={setMode} />
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

      {visible.length === 0 ? (
        <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
      ) : (
        <Renderer
          caminos={visible}
          actions={{
            busyId,
            remove: (caminoId) => void handleDelete(caminoId),
            archive: (caminoId) => void handleArchiveToggle(caminoId),
          }}
        />
      )}
    </div>
  );
}
