"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressPlaceholder } from "@/components/progress/ProgressPlaceholder";
import { ProgressSections } from "@/components/progress/ProgressSections";
import { useProgressSection } from "@/components/progress/ProgressSection";
import { ProgressSortSelect } from "@/components/progress/ProgressSortSelect";
import { ProgressStateSegments } from "@/components/progress/ProgressStateSegments";
import { countByState, sortByProgress } from "@/components/progress/progress-list-shared";
import { DEFAULT_OWN_FILTERS, OWN_SORTS, type OwnFilters } from "@/components/progress/progress-tabs";
import { useProgressFilters } from "@/components/progress/use-progress-filters";
import { ApiError } from "@/lib/api/client";
import { archiveArtistJourney, deleteArtistJourney, unarchiveArtistJourney } from "@/lib/api/artist-journeys";
import type { ArtistJourneySummary } from "@/lib/api/schemas";
import { ArtistJourneyDeleteDialog } from "./ArtistJourneyDeleteDialog";
import { ArtistJourneyModeSwitcher } from "./ArtistJourneyModeSwitcher";
import { ArtistJourneysDetailed } from "./ArtistJourneysDetailed";
import { ArtistJourneysIndex } from "./ArtistJourneysIndex";
import { ArtistJourneysGraphic } from "./ArtistJourneysGraphic";
import { normalizeForSearch, type ArtistJourneyListActions } from "./artist-journey-list-shared";
import { useArtistJourneyViewMode } from "./use-artist-journey-view-mode";

interface ArtistJourneyListProps {
  journeys: ArtistJourneySummary[];
  /** Filtros leídos de la URL por la página (ya validados). */
  initialFilters?: Partial<OwnFilters>;
}

const RENDERERS = {
  detailed: ArtistJourneysDetailed,
  index: ArtistJourneysIndex,
  graphic: ArtistJourneysGraphic,
};

// Listado propio de `/me/artist-journeys` (openspec: add-artist-journey,
// add-artist-journey-management-page): punto de entrada desde el menú de
// usuario. Cada entrada enlaza a la página de gestión dedicada de ese
// recorrido, con enlaces secundarios a la página del artista y a eliminarlo
// directamente desde acá (sin pasar por la gestión), sin progreso ni
// fracciones — mismo criterio que la faceta de perfil (§6.4.1): solo el
// estado. Buscador, orden (por agregado, alfabético o por estado) y filtro
// por estado (openspec: add-artist-journey-state-filter) resueltos en el
// cliente, sin llamada al servidor — el listado completo ya llegó del
// servidor en orden de activación descendente — y los mismos tres modos de
// visualización que Want to Listen y el detalle de listas
// (Detallada/Índice/Gráfico).
//
// Desde refine-progress-page-phase1: los filtros viven en la URL (D5), eliminar abre un diálogo que nombra al artista
// (D2) y, hasta leer el modo guardado, se muestra un marcador en vez de pintar Detallada y saltar (D1). Desde
// redesign-progress-toolbar: segmentos de estado con cifras, orden "Más avanzadas", el total de la pestaña se informa a
// la sección y, tras crear desde el diálogo de la cabecera, el listado toma los datos nuevos sin perder los filtros.
export function ArtistJourneyList({ journeys, initialFilters }: ArtistJourneyListProps) {
  const t = useTranslations("artistJourney");
  const { reportTotal, openPrimary } = useProgressSection();
  const [mode, setMode, modeReady] = useArtistJourneyViewMode();
  const [filters, setFilter] = useProgressFilters(DEFAULT_OWN_FILTERS, initialFilters);
  const [items, setItems] = useState(journeys);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ArtistJourneySummary | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [actionError, setActionError] = useState(false);

  // `router.refresh()` (al cerrar el diálogo de la cabecera tras crear algo) trae un arreglo nuevo.
  useEffect(() => setItems(journeys), [journeys]);
  useEffect(() => reportTotal("discographies", items.length), [items.length, reportTotal]);

  const stateCounts = useMemo(() => countByState(items), [items]);

  const visible = useMemo(() => {
    const q = normalizeForSearch(filters.q.trim());
    const byState = filters.state === "all" ? items : items.filter((journey) => journey.state === filters.state);
    const filtered = q ? byState.filter((journey) => normalizeForSearch(journey.artistName).includes(q)) : byState;
    // `items` ya llega del servidor en orden de agregado descendente
    // (más reciente primero) — "recent" no necesita reordenar.
    if (filters.sort === "recent") return filtered;
    if (filters.sort === "progress") return sortByProgress(filtered);
    return [...filtered].sort((a, b) => a.artistName.localeCompare(b.artistName));
  }, [items, filters]);

  async function handleDelete(artistId: string) {
    setBusyId(artistId);
    setDeleteError(false);
    try {
      await deleteArtistJourney(artistId);
      setItems((current) => current.filter((journey) => journey.artistId !== artistId));
    } catch (error) {
      // Ya no existe del lado del servidor: igual lo sacamos de la vista.
      if (error instanceof ApiError && error.code === "ARTIST_JOURNEY_NOT_FOUND") {
        setItems((current) => current.filter((journey) => journey.artistId !== artistId));
      } else {
        setDeleteError(true);
      }
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchiveToggle(artistId: string) {
    const journey = items.find((current) => current.artistId === artistId);
    if (!journey) return;
    setBusyId(artistId);
    setActionError(false);
    try {
      const updated =
        journey.state === "archived" ? await unarchiveArtistJourney(artistId) : await archiveArtistJourney(artistId);
      setItems((current) =>
        current.map((item) => (item.artistId === artistId ? { ...item, state: updated.state } : item)),
      );
    } catch (error) {
      if (error instanceof ApiError && error.code === "ARTIST_JOURNEY_NOT_FOUND") {
        setItems((current) => current.filter((item) => item.artistId !== artistId));
      } else {
        setActionError(true);
      }
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title={t("myJourneysEmpty")}
        description={t("myJourneysEmptyHint")}
        action={
          <Button variant="secondary" onClick={openPrimary}>
            {t("startJourney")}
          </Button>
        }
      />
    );
  }

  const Renderer = RENDERERS[mode];
  const actions: ArtistJourneyListActions = {
    busyId,
    requestRemove: (artistId) => setPendingDelete(items.find((item) => item.artistId === artistId) ?? null),
    archive: (artistId) => void handleArchiveToggle(artistId),
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
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
          <ProgressSortSelect value={filters.sort} options={OWN_SORTS} onChange={(value) => setFilter("sort", value)} />
          <div className={`ml-auto ${modeReady ? "" : "invisible"}`}>
            <ArtistJourneyModeSwitcher mode={mode} onChange={setMode} />
          </div>
        </div>
        <ProgressStateSegments
          value={filters.state}
          onChange={(value) => setFilter("state", value)}
          counts={stateCounts}
        />
      </div>

      {deleteError && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("listDeleteError")}
        </span>
      )}
      {actionError && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("listArchiveError")}
        </span>
      )}

      {!modeReady ? (
        <ProgressPlaceholder count={visible.length} />
      ) : visible.length === 0 ? (
        <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
      ) : (
        <ProgressSections
          items={visible}
          grouped={filters.state === "all"}
          render={(group) => <Renderer journeys={group} actions={actions} />}
        />
      )}

      <ArtistJourneyDeleteDialog
        journey={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) void handleDelete(target.artistId);
        }}
      />
    </div>
  );
}
