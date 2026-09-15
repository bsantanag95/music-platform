"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ApiError } from "@/lib/api/client";
import { archiveArtistJourney, deleteArtistJourney, unarchiveArtistJourney } from "@/lib/api/artist-journeys";
import type { ArtistJourneySummary } from "@/lib/api/schemas";
import { ArtistJourneyModeSwitcher } from "./ArtistJourneyModeSwitcher";
import { ArtistJourneysDetailed } from "./ArtistJourneysDetailed";
import { ArtistJourneysIndex } from "./ArtistJourneysIndex";
import { ArtistJourneysGraphic } from "./ArtistJourneysGraphic";
import { normalizeForSearch } from "./artist-journey-list-shared";
import { useArtistJourneyViewMode } from "./use-artist-journey-view-mode";

interface ArtistJourneyListProps {
  journeys: ArtistJourneySummary[];
}

type ArtistJourneySort = "recent" | "alpha" | "state";
type ArtistJourneyStateFilter = "all" | ArtistJourneySummary["state"];

// Orden entre estados al ordenar "Por estado": en curso primero (lo activo),
// completo después, archivado al final — mismo orden canónico que
// `ARTIST_JOURNEY_STATES` (ver services/artist-journeys/types.ts).
const STATE_ORDER: Record<ArtistJourneySummary["state"], number> = {
  in_progress: 0,
  complete: 1,
  archived: 2,
};

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
export function ArtistJourneyList({ journeys }: ArtistJourneyListProps) {
  const t = useTranslations("artistJourney");
  const [mode, setMode] = useArtistJourneyViewMode();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ArtistJourneySort>("recent");
  const [stateFilter, setStateFilter] = useState<ArtistJourneyStateFilter>("all");
  const [items, setItems] = useState(journeys);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [actionError, setActionError] = useState(false);

  const visible = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    const byState = stateFilter === "all" ? items : items.filter((journey) => journey.state === stateFilter);
    const filtered = q
      ? byState.filter((journey) => normalizeForSearch(journey.artistName).includes(q))
      : byState;
    // `items` ya llega del servidor en orden de agregado descendente
    // (más reciente primero) — "recent" no necesita reordenar.
    if (sort === "recent") return filtered;
    if (sort === "state") {
      // `sort` es estable: dentro de un mismo estado se conserva el orden de
      // agregado, sin un segundo criterio explícito.
      return [...filtered].sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]);
    }
    return [...filtered].sort((a, b) => a.artistName.localeCompare(b.artistName));
  }, [items, query, sort, stateFilter]);

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
        journey.state === "archived"
          ? await unarchiveArtistJourney(artistId)
          : await archiveArtistJourney(artistId);
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
    return <EmptyState title={t("myJourneysEmpty")} description={t("myJourneysEmptyHint")} />;
  }

  const Renderer = RENDERERS[mode];

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="w-full rounded-md border border-ink-border bg-ink-surface px-3.5 py-2 font-data text-sm text-paper placeholder:text-paper-muted sm:max-w-xs"
          />
          <FilterSelect
            value={sort}
            onChange={(value) => setSort(value as ArtistJourneySort)}
            ariaLabel={t("sortLabel")}
            widthClassName="w-[13ch]"
          >
            <option value="recent">{t("sort.recent")}</option>
            <option value="alpha">{t("sort.alpha")}</option>
            <option value="state">{t("sort.state")}</option>
          </FilterSelect>
          <FilterSelect
            value={stateFilter}
            onChange={(value) => setStateFilter(value as ArtistJourneyStateFilter)}
            ariaLabel={t("stateFilterLabel")}
            widthClassName="w-[13ch]"
          >
            <option value="all">{t("stateFilterAll")}</option>
            <option value="in_progress">{t("stateInProgress")}</option>
            <option value="complete">{t("stateComplete")}</option>
            <option value="archived">{t("stateArchived")}</option>
          </FilterSelect>
        </div>
        <ArtistJourneyModeSwitcher mode={mode} onChange={setMode} />
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

      {visible.length === 0 ? (
        <EmptyState title={t("noResultsTitle")} description={t("noResultsDescription")} />
      ) : (
        <Renderer
          journeys={visible}
          actions={{
            busyId,
            remove: (artistId) => void handleDelete(artistId),
            archive: (artistId) => void handleArchiveToggle(artistId),
          }}
        />
      )}
    </div>
  );
}
