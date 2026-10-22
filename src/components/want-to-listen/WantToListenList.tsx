"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMyWantToListen, removeFromWantToListen } from "@/lib/api/want-to-listen";
import type { WantToListenEntry, WantToListenListResponse } from "@/lib/api/schemas";
import { useJourneyStatuses } from "./use-journey-statuses";
import { WantToListenModeSwitcher } from "./WantToListenModeSwitcher";
import { WantToListenSection } from "./WantToListenSection";
import { groupWantToListenByType } from "./want-to-listen-shared";
import { useWantToListenViewMode } from "./use-want-to-listen-view-mode";

interface WantToListenListProps {
  initial: WantToListenListResponse;
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

// Listado propio de Want to Listen: dos secciones (artistas, álbumes) — mismo
// criterio de agrupación por tipo que el muro de favoritos — con los mismos
// tres modos de visualización que el detalle de listas (Detallada/Índice/
// Gráfico), compartidos entre ambas secciones. Sin audiencia ni filtros: es
// una lista de gestión personal.
export function WantToListenList({ initial }: WantToListenListProps) {
  const t = useTranslations("wantToListen");
  const [mode, setMode, modeReady] = useWantToListenViewMode();
  const [items, setItems] = useState<WantToListenEntry[]>(initial.items);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Entrada cuyo quitado falló: el aviso va junto a ella, no al final de la página.
  const [errorId, setErrorId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const groups = useMemo(() => groupWantToListenByType(items), [items]);
  // Antes del retorno temprano: los hooks no pueden ir después de un `return` condicional.
  const journeys = useJourneyStatuses(items);

  if (items.length === 0) {
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
        <span role="status" aria-live="polite" className="sr-only">
          {announce}
        </span>
      </>
    );
  }

  const priorityIds = new Set(items.slice(0, PRIORITY_COVERS).map((item) => item.id));

  const handleRemove = async (id: string) => {
    const entry = items.find((item) => item.id === id);
    if (!entry) return;
    setBusyId(id);
    setErrorId(null);
    try {
      await removeFromWantToListen({ type: entry.targetType, id: entry.target.id });
      setItems((current) => current.filter((item) => item.id !== id));
      setAnnounce(t("removedAnnouncement", { title: entry.target.title }));
    } catch {
      setErrorId(id);
    } finally {
      setBusyId(null);
    }
  };

  const handleLoadMore = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = await getMyWantToListen(page + 1, 20);
      setItems((current) => [...current, ...next.items]);
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
      <div className="flex items-center justify-end">
        <div className={modeReady ? "" : "invisible"} aria-hidden={modeReady ? undefined : true}>
          <WantToListenModeSwitcher mode={mode} onChange={setMode} />
        </div>
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>

      {modeReady ? (
        groups.map((group) => (
          <WantToListenSection
            key={group.type}
            group={group}
            mode={mode}
            complete={!hasNext}
            priorityIds={priorityIds}
            actions={{
              busy: busyId !== null,
              errorId,
              remove: (id) => void handleRemove(id),
              journeyStatus: journeys.statusOf,
              journeyAdded: journeys.markAdded,
              journeyError: journeys.markError,
            }}
          />
        ))
      ) : (
        <ListPlaceholder />
      )}

      {hasNext && (
        <div className="flex flex-col items-center gap-2">
          <Button variant="secondary" disabled={loading} onClick={() => void handleLoadMore()}>
            {loading ? t("loadingMore") : t("loadMore")}
          </Button>
          {loadError && (
            <span role="alert" className="font-data text-xs text-danger">
              {t("loadError")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
