"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { QuickActionsDialog } from "@/components/quick-actions/QuickActionsDialog";

// "+ Seguir artista" de la cabecera de `/me/artists` (openspec: redesign-artists-toolbar, D1): abre el diálogo de
// acciones rápidas en la acción "Seguir artista". Al seguir, el diálogo emite el aviso de cambios y la lista se
// actualiza; al cerrarlo, el foco vuelve a este botón. Mismo aspecto que la acción principal de `/me/progress`.
export function FollowArtistButton() {
  const t = useTranslations("users.artistsFollowed");
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border border-amber bg-amber px-3.5 font-display text-sm text-ink transition-colors hover:bg-amber-hover [@media(pointer:coarse)]:min-h-11"
      >
        <span className="hidden sm:inline">{t("followAction")}</span>
        <span className="sm:hidden">{t("followActionShort")}</span>
      </button>
      {open ? <QuickActionsDialog onClose={close} initialAction="follow" /> : null}
    </>
  );
}
