"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { toggleFavorite } from "@/lib/api/favorites";
import { ApiError } from "@/lib/api/client";
import type { FavoriteTarget } from "@/lib/api/schemas";

interface FavoriteButtonProps {
  target: FavoriteTarget;
  authenticated: boolean;
  initialActive?: boolean;
}

// Acción "Marcar como favorito": toggle idempotente sobre artista, álbum o
// canción. Sin sesión, redirige al login. Refleja el estado activo local
// (inicializado desde el server cuando está disponible).
export function FavoriteButton({ target, authenticated, initialActive = false }: FavoriteButtonProps) {
  const t = useTranslations("favorites");
  const [active, setActive] = useState(initialActive);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  if (!authenticated) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center gap-2 rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm text-paper transition-colors hover:border-amber"
      >
        {t("signInToFavorite")}
      </Link>
    );
  }

  const handleToggle = async () => {
    setBusy(true);
    setErrorCode(null);
    try {
      const result = await toggleFavorite(target);
      setActive(result !== null);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={active ? "primary" : "secondary"}
        disabled={busy}
        onClick={() => void handleToggle()}
      >
        {busy ? t("saving") : active ? t("removeFavorite") : t("addFavorite")}
      </Button>
      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      )}
    </div>
  );
}