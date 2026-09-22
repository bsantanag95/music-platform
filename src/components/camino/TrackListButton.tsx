"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { setListTracking } from "@/lib/api/camino";

interface TrackListButtonProps {
  listId: string;
  initialTracking: boolean;
  initialProgress: { selectedCount: number; listenedCount: number } | null;
}

// Tracking de progreso propio sobre una lista ajena de álbumes (openspec:
// add-camino, capability list-saves): eje independiente de Guardar/Seguir —
// activarlo crea el guardado si todavía no existía, sin tocar `following`.
// Solo se renderiza en listas de álbumes (`entityType = 'release-group'`);
// el caller decide esa condición.
export function TrackListButton({ listId, initialTracking, initialProgress }: TrackListButtonProps) {
  const t = useTranslations("camino");
  const [tracking, setTracking] = useState(initialTracking);
  const [progress, setProgress] = useState(initialProgress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const toggle = async () => {
    const next = !tracking;
    setBusy(true);
    setError(false);
    try {
      const updated = await setListTracking(listId, next);
      setTracking(updated.tracking);
      if (!next) setProgress(null);
    } catch (err) {
      if (!(err instanceof ApiError && err.code === "LIST_NOT_FOUND")) setError(true);
    } finally {
      setBusy(false);
    }
  };

  const ratio = progress && progress.selectedCount > 0 ? progress.listenedCount / progress.selectedCount : 0;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggle()}
          aria-pressed={tracking}
          className={`rounded border px-2.5 py-1 font-data text-xs transition-colors disabled:opacity-50 ${
            tracking
              ? "border-petrol/50 text-petrol hover:border-petrol"
              : "border-ink-border text-paper-muted hover:border-paper hover:text-paper"
          }`}
        >
          {tracking ? t("trackingOn") : t("trackingOff")}
        </button>
        {tracking && progress && progress.selectedCount > 0 && (
          <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-ink-border">
            <div className="h-full rounded-full bg-petrol" style={{ width: `${Math.round(ratio * 100)}%` }} />
          </div>
        )}
      </div>
      {error ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      ) : null}
    </div>
  );
}
