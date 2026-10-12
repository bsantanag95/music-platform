"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError } from "@/lib/api/client";
import { saveList, unsaveList } from "@/lib/api/lists";

interface SaveListButtonProps {
  listId: string;
  initialSaved: boolean;
  initialFollowing: boolean;
  /** Aviso al padre tras un cambio confirmado (p. ej. quitar de "Guardadas"). */
  onChange?: (state: { saved: boolean; following: boolean }) => void;
  /**
   * `full` (predeterminado): botones con texto. `compact`: dos botones de ícono (marcador y campana) para las
   * tarjetas densas de `/lists`, donde "Guardada" + "Siguiendo" en ámbar y petróleo ocupaban una fila entera
   * en cada tarjeta. El nombre accesible y el `title` siguen diciendo la acción.
   */
  variant?: "full" | "compact";
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" className="size-4">
      <path d="M6 4h12v17l-6-4-6 4z" />
    </svg>
  );
}

function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-4">
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

// Guardar (marcador privado) + Seguir una lista ajena. Actualización optimista
// con rollback (mismo criterio que los favoritos). Seguir solo tiene sentido
// sobre una lista ya guardada, así que aparece recién cuando `saved` es true.
export function SaveListButton({
  listId,
  initialSaved,
  initialFollowing,
  onChange,
  variant = "full",
}: SaveListButtonProps) {
  const t = useTranslations("lists");
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(initialSaved);
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const commit = async (next: { saved: boolean; following: boolean }) => {
    const prev = { saved, following };
    setSaved(next.saved);
    setFollowing(next.following);
    setBusy(true);
    setError(false);
    try {
      if (next.saved) {
        await saveList(listId, next.following);
      } else {
        await unsaveList(listId);
      }
      onChange?.(next);
      // Refresca cualquier lista de listas montada o cacheada (Mis listas,
      // Guardadas, Descubrir): sin esto, volver a una pestaña ya visitada
      // mostraría el estado de guardado previo hasta recargar la página.
      void queryClient.invalidateQueries({ queryKey: ["lists"], exact: false });
    } catch (err) {
      setSaved(prev.saved);
      setFollowing(prev.following);
      if (!(err instanceof ApiError && err.code === "LIST_NOT_FOUND")) setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (variant === "compact") {
    const iconButton =
      "grid size-8 place-items-center rounded-md border transition-colors disabled:opacity-50";
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          {saved ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void commit({ saved: true, following: !following })}
              aria-pressed={following}
              aria-label={following ? t("following") : t("follow")}
              title={following ? t("following") : t("follow")}
              className={`${iconButton} ${
                following
                  ? "border-petrol/50 text-petrol hover:border-petrol"
                  : "border-ink-border text-paper-muted hover:border-paper-muted/60 hover:text-paper"
              }`}
            >
              <BellIcon filled={following} />
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void commit(saved ? { saved: false, following: false } : { saved: true, following: false })}
            aria-pressed={saved}
            aria-label={saved ? t("savedToLibrary") : t("saveToLibrary")}
            title={saved ? t("savedToLibrary") : t("saveToLibrary")}
            className={`${iconButton} ${
              saved
                ? "border-amber/40 text-amber hover:border-amber"
                : "border-ink-border text-paper-muted hover:border-paper-muted/60 hover:text-paper"
            }`}
          >
            <BookmarkIcon filled={saved} />
          </button>
        </div>
        {error ? (
          <span role="alert" className="font-data text-xs text-danger">
            {t("saveListError")}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5">
        {saved ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void commit({ saved: false, following: false })}
            className="rounded border border-amber/40 bg-amber/10 px-2.5 py-1 font-data text-xs text-amber transition-colors hover:border-amber disabled:opacity-50"
          >
            {t("savedToLibrary")}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void commit({ saved: true, following: false })}
            className="rounded border border-ink-border px-2.5 py-1 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper disabled:opacity-50"
          >
            {t("saveToLibrary")}
          </button>
        )}

        {saved ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void commit({ saved: true, following: !following })}
            aria-pressed={following}
            className={`rounded border px-2.5 py-1 font-data text-xs transition-colors disabled:opacity-50 ${
              following
                ? "border-petrol/50 text-petrol hover:border-petrol"
                : "border-ink-border text-paper-muted hover:border-paper hover:text-paper"
            }`}
          >
            {following ? t("following") : t("follow")}
          </button>
        ) : null}
      </div>
      {error ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveListError")}
        </span>
      ) : null}
    </div>
  );
}
