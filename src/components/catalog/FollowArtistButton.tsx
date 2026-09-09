"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { followArtist, unfollowArtist } from "@/lib/api/catalog";

interface FollowArtistButtonProps {
  artistId: string;
  authenticated: boolean;
  initialFollowing?: boolean;
}

// "Seguir" / "Siguiendo" en la página de artista (openspec: add-artist-following).
// Relación unilateral, sin aprobación. Toggle optimista con reversión en error.
// Sin sesión → enlace a login (mismo patrón que `FavoriteButton`). Sin conteo
// de seguidores en esta fase (OQ2).
export function FollowArtistButton({
  artistId,
  authenticated,
  initialFollowing = false,
}: FollowArtistButtonProps) {
  const t = useTranslations("catalog.artist");
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [errored, setErrored] = useState(false);

  if (!authenticated) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center gap-2 rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm text-paper transition-colors hover:border-amber"
      >
        {t("signInToFollow")}
      </Link>
    );
  }

  async function toggle() {
    const next = !following;
    setFollowing(next);
    setBusy(true);
    setErrored(false);
    try {
      await (next ? followArtist(artistId) : unfollowArtist(artistId));
    } catch {
      setFollowing(!next);
      setErrored(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={following ? "primary" : "secondary"}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {following ? t("following") : t("follow")}
      </Button>
      {errored && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("followError")}
        </span>
      )}
    </div>
  );
}
