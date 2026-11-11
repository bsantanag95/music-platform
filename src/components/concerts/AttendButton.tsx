"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { attendConcert, unattendConcert } from "@/lib/api/concerts";

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
    <span className="inline-flex flex-col items-end gap-0.5">
      {attending ? (
        <span className="inline-flex items-center gap-2 font-data text-xs">
          <span className="rounded border border-amber/60 bg-amber/10 px-2.5 py-1 uppercase tracking-wide text-amber">
            ✓ {t("attending")}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggle(false)}
            className="text-paper-muted underline-offset-2 hover:text-paper hover:underline disabled:opacity-50"
          >
            {t("unattend")}
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggle(true)}
          className="rounded border border-ink-border px-2.5 py-1 font-data text-xs uppercase tracking-wide text-paper-muted transition-colors hover:border-amber hover:text-paper disabled:opacity-50"
        >
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
