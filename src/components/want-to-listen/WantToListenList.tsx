"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMyWantToListen, removeFromWantToListen } from "@/lib/api/want-to-listen";
import type { WantToListenEntry, WantToListenListResponse } from "@/lib/api/schemas";
import { WantToListenModeSwitcher } from "./WantToListenModeSwitcher";
import { WantToListenSection } from "./WantToListenSection";
import { groupWantToListenByType } from "./want-to-listen-shared";
import { useWantToListenViewMode } from "./use-want-to-listen-view-mode";

interface WantToListenListProps {
  initial: WantToListenListResponse;
}

// Listado propio de Want to Listen: dos secciones (artistas, álbumes) — mismo
// criterio de agrupación por tipo que el muro de favoritos — con los mismos
// tres modos de visualización que el detalle de listas (Detallada/Índice/
// Gráfico), compartidos entre ambas secciones. Sin audiencia ni filtros: es
// una lista de gestión personal.
export function WantToListenList({ initial }: WantToListenListProps) {
  const t = useTranslations("wantToListen");
  const [mode, setMode] = useWantToListenViewMode();
  const [items, setItems] = useState<WantToListenEntry[]>(initial.items);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const groups = useMemo(() => groupWantToListenByType(items), [items]);

  if (items.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  const handleRemove = async (id: string) => {
    const entry = items.find((item) => item.id === id);
    if (!entry) return;
    setBusyId(id);
    setLoadError(false);
    try {
      await removeFromWantToListen({ type: entry.targetType, id: entry.target.id });
      setItems((current) => current.filter((item) => item.id !== id));
    } catch {
      setLoadError(true);
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
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-end">
        <WantToListenModeSwitcher mode={mode} onChange={setMode} />
      </div>

      {groups.map((group) => (
        <WantToListenSection
          key={group.type}
          group={group}
          mode={mode}
          actions={{ busy: busyId !== null, remove: (id) => void handleRemove(id) }}
        />
      ))}

      {loadError && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("loadError")}
        </span>
      )}

      {hasNext && (
        <Button variant="secondary" disabled={loading} onClick={() => void handleLoadMore()}>
          {loading ? t("loadingMore") : t("loadMore")}
        </Button>
      )}
    </div>
  );
}
