"use client";

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
}

// Guardar (marcador privado) + Seguir una lista ajena. Actualización optimista
// con rollback (mismo criterio que los favoritos). Seguir solo tiene sentido
// sobre una lista ya guardada, así que aparece recién cuando `saved` es true.
export function SaveListButton({
  listId,
  initialSaved,
  initialFollowing,
  onChange,
}: SaveListButtonProps) {
  const t = useTranslations("lists");
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
    } catch (err) {
      setSaved(prev.saved);
      setFollowing(prev.following);
      if (!(err instanceof ApiError && err.code === "LIST_NOT_FOUND")) setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
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
