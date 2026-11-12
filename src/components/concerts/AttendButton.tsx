"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { attendConcert, unattendConcert } from "@/lib/api/concerts";
import { CONCERT_ROW_BUTTON, CheckIcon } from "./concert-ui";

// "Estuve ahí" / "Estuviste · Quitar" (openspec: add-shared-concerts-phase1). Cambia al instante y refresca la ruta
// para que la cifra de personas salga del servidor. Sin sesión no se muestra (lo decide quien lo usa).

interface AttendButtonProps {
  concertId: string;
  /** Artista de contexto (la pestaña desde la que se pulsa): será el artista del registro personal. */
  artistId?: string;
  initialAttending: boolean;
}

export function AttendButton({ concertId, artistId, initialAttending }: AttendButtonProps) {
  const t = useTranslations("concerts.shared");
  const router = useRouter();
  const [attending, setAttending] = useState(initialAttending);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function toggle(next: boolean) {
    setBusy(true);
    setError(false);
    try {
      if (next) await attendConcert(concertId, artistId);
      else await unattendConcert(concertId);
      setAttending(next);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      {attending ? (
        // Un solo control en dos partes: el estado (no interactivo) y, tras una línea, la acción de quitarlo. Quitar no
        // comparte botón con el estado para que un toque de más no borre el registro.
        <span aria-busy={busy} className="inline-flex min-h-8 items-stretch overflow-hidden rounded border border-amber/50 font-data text-xs">
          <span className="inline-flex items-center gap-1.5 bg-amber/10 px-2.5 uppercase tracking-wide text-amber">
            <CheckIcon />
            {t("attending")}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggle(false)}
            className="border-l border-amber/50 px-2.5 text-paper-muted transition-colors hover:bg-ink hover:text-paper focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("unattend")}
          </button>
        </span>
      ) : (
        <button type="button" disabled={busy} aria-busy={busy} onClick={() => void toggle(true)} className={CONCERT_ROW_BUTTON}>
          {t("attend")}
        </button>
      )}
      {error && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("attendError")}
        </span>
      )}
    </span>
  );
}
