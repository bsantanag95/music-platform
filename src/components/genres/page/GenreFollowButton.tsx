"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { followArtist, unfollowArtist } from "@/lib/api/catalog";

// Seguir / Siguiendo desde la tarjeta de artista de la página de género (openspec:
// add-genre-artist-discovery, capability `genre-artist-discovery`). Actualización optimista: cambia al
// instante y vuelve atrás si la operación falla. Control propio, nunca dentro de un enlace. Solo se
// renderiza con sesión (la tarjeta decide).

interface GenreFollowButtonProps {
  artistId: string;
  artistName: string;
  initialFollowing: boolean;
}

export function GenreFollowButton({ artistId, artistName, initialFollowing }: GenreFollowButtonProps) {
  const t = useTranslations("catalog.genres.page.artists");
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    const next = !following;
    setBusy(true);
    setFollowing(next);
    try {
      await (next ? followArtist(artistId) : unfollowArtist(artistId));
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={t(following ? "unfollowAria" : "followAria", { name: artistName })}
      disabled={busy}
      onClick={() => void toggle()}
      className={`rounded-full border px-3 py-1 font-data text-xs transition-colors disabled:opacity-60 ${
        following ? "border-amber bg-amber text-ink" : "border-ink-border text-paper hover:border-amber"
      }`}
    >
      {t(following ? "following" : "follow")}
    </button>
  );
}
